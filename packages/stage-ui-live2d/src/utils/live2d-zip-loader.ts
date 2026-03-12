import type { ModelSettings } from 'pixi-live2d-display/cubism4'

import JSZip from 'jszip'

import { Cubism4ModelSettings, ZipLoader } from 'pixi-live2d-display/cubism4'

ZipLoader.zipReader = (data: Blob, url: string) => {
  console.debug('[Live2D ZipLoader] Reading zip:', { url, size: data.size, type: data.type })
  return JSZip.loadAsync(data).catch((error) => {
    console.error('[Live2D ZipLoader] Failed to load zip:', { url, error })
    throw error
  })
}

const defaultCreateSettings = ZipLoader.createSettings
ZipLoader.createSettings = async (reader: JSZip) => {
  const filePaths = Object.keys(reader.files)
  console.debug('[Live2D ZipLoader] Creating settings from zip files:', filePaths)

  if (!filePaths.find(file => isSettingsFile(file))) {
    console.debug('[Live2D ZipLoader] No model3.json found, creating fake settings')
    return createFakeSettings(filePaths)
  }

  console.debug('[Live2D ZipLoader] Using default settings creation')
  return defaultCreateSettings(reader)
}

export function isSettingsFile(file: string) {
  return file.endsWith('model3.json')
}

export function isMocFile(file: string) {
  return file.endsWith('.moc3')
}

export function basename(path: string): string {
  // https://stackoverflow.com/a/15270931
  return path.split(/[\\/]/).pop()!
}

// copy and modified from https://github.com/guansss/live2d-viewer-web/blob/f6060b2ce52c2e26b6b61fa903c837fe343f72d1/src/app/upload.ts#L81-L142
function createFakeSettings(files: string[]): ModelSettings {
  console.debug('[Live2D ZipLoader] Creating fake settings from files:', files)
  const mocFiles = files.filter(file => isMocFile(file))

  if (mocFiles.length !== 1) {
    const fileList = mocFiles.length ? `(${mocFiles.map(f => `"${f}"`).join(',')})` : ''
    const error = `Expected exactly one moc file, got ${mocFiles.length} ${fileList}`
    console.error('[Live2D ZipLoader]', error, { allFiles: files })
    throw new Error(error)
  }

  const mocFile = mocFiles[0]
  const modelName = basename(mocFile).replace(/\.moc3?/, '')

  const textures = files.filter(f => f.endsWith('.png'))

  if (!textures.length) {
    console.error('[Live2D ZipLoader] Textures not found', { allFiles: files })
    throw new Error('Textures not found')
  }

  const motions = files.filter(f => f.endsWith('.mtn') || f.endsWith('.motion3.json'))
  const physics = files.find(f => f.includes('physics'))
  const pose = files.find(f => f.includes('pose'))

  console.debug('[Live2D ZipLoader] Fake settings created:', {
    modelName,
    mocFile,
    texturesCount: textures.length,
    motionsCount: motions.length,
    hasPhysics: !!physics,
    hasPose: !!pose,
  })

  const settings = new Cubism4ModelSettings({
    url: `${modelName}.model3.json`,
    Version: 3,
    FileReferences: {
      Moc: mocFile,
      Textures: textures,
      Physics: physics,
      Pose: pose,
      Motions: motions.length
        ? {
            '': motions.map(motion => ({ File: motion })),
          }
        : undefined,
    },
  })

  settings.name = modelName;

  // provide this property for FileLoader
  (settings as any)._objectURL = `example://${settings.url}`

  return settings
}

ZipLoader.readText = (jsZip: JSZip, path: string) => {
  const file = jsZip.file(path)

  if (!file) {
    throw new Error(`Cannot find file: ${path}`)
  }

  return file.async('text')
}

ZipLoader.getFilePaths = (jsZip: JSZip) => {
  const paths: string[] = []

  jsZip.forEach(relativePath => paths.push(relativePath))

  return Promise.resolve(paths)
}

ZipLoader.getFiles = (jsZip: JSZip, paths: string[]) =>
  Promise.all(paths.map(
    async (path) => {
      const fileName = path.slice(path.lastIndexOf('/') + 1)

      const blob = await jsZip.file(path)!.async('blob')

      return new File([blob], fileName)
    },
  ))
