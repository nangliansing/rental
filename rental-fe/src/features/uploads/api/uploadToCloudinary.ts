import type { UploadSignature } from "./createUploadSignature"

export type UploadedMedia = {
    publicId: string
    secureUrl: string
    resourceType: string
    format: string | null
    width: number | null
    height: number | null
    bytes: number | null
    position: number
    alt: string | null
    isCover: boolean
}

type CloudinaryUploadResponse = {
    secure_url?: string
    public_id?: string
    resource_type?: string
    format?: string
    width?: number
    height?: number
    bytes?: number
    error?: {
        message?: string
    }
}

type UploadToCloudinaryInput = {
    file: File
    signature: UploadSignature
    signal?: AbortSignal
    onProgress?: (progress: number) => void
}

function parseCloudinaryResponse(responseText: string): CloudinaryUploadResponse {
    try {
        return JSON.parse(responseText) as CloudinaryUploadResponse
    } catch {
        return {}
    }
}

function getUploadProgress(loaded: number, total: number) {
    return Math.min(Math.max(Math.round((loaded / total) * 100), 0), 100)
}

export function uploadToCloudinary({
    file,
    signature,
    signal,
    onProgress,
}: UploadToCloudinaryInput): Promise<UploadedMedia> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()

        const cleanup = () => {
            signal?.removeEventListener("abort", handleAbort)
        }

        const handleAbort = () => {
            xhr.abort()
        }

        formData.append("file", file)
        formData.append("api_key", signature.apiKey)
        formData.append("timestamp", String(signature.timestamp))
        formData.append("folder", signature.folder)
        formData.append("public_id", signature.publicId)
        formData.append("signature", signature.signature)

        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return

            onProgress?.(getUploadProgress(event.loaded, event.total))
        }

        xhr.onload = () => {
            cleanup()
            const data = parseCloudinaryResponse(xhr.responseText)

            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new Error(data.error?.message ?? "Could not upload file"))
                return
            }

            if (!data.secure_url || !data.public_id) {
                reject(new Error("Cloudinary upload response is missing media data"))
                return
            }

            onProgress?.(100)
            resolve({
                publicId: data.public_id,
                secureUrl: data.secure_url,
                resourceType: data.resource_type ?? "image",
                format: data.format ?? null,
                width: data.width ?? null,
                height: data.height ?? null,
                bytes: data.bytes ?? null,
                position: 0,
                alt: null,
                isCover: false,
            })
        }

        xhr.onerror = () => {
            cleanup()
            reject(new Error("Could not upload file"))
        }

        xhr.onabort = () => {
            cleanup()
            reject(new Error("Upload canceled"))
        }

        if (signal?.aborted) {
            reject(new Error("Upload canceled"))
            return
        }

        signal?.addEventListener("abort", handleAbort, { once: true })

        xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`
        )
        xhr.send(formData)
    })
}
