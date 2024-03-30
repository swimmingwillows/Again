import {
    Request,
    RequestInterceptor,
    Response
} from 'paperback-extensions-common'
import { ByteArray } from 'paperback-extensions-common/dist/models/RawData'
import {HEX_GROUP} from '../MangaPlusHelper'

export class ImageInterceptor implements RequestInterceptor {
    encryptionKeys: Record<string, string> = {}
    async interceptRequest(request: Request): Promise<Request> {
        const encryptionKey = request.url.match(/[?&]encryptionKey=([^&]\w+)&?/)
        if (encryptionKey == null || encryptionKey[1] == null) return request

        // Change the url and remove the encryptionKey to avoid detection.
        const newRequest = createRequestObject({
            url: request.url.replace(/[?&]encryptionkey=[^&]+/, ''),
            method: 'GET',
            headers: {
                ...(request.headers ?? {}),
                ...{
                    'referer': request.url
                }
            }
        })

        this.encryptionKeys[newRequest.url] = encryptionKey[1]
        return newRequest
    }

  
    async interceptResponse(response: Response): Promise<Response> {
        const encryptionKey = this.encryptionKeys[response.request.url]
        delete this.encryptionKeys[response.request.url]

        if (encryptionKey) {
            response.headers['content-type'] = 'image/jpeg'

            try {
                response.rawData = this.decodeImage(
                    encryptionKey,
                    createByteArray(response.rawData)
                )
            } catch (error) {
                console.log(error)
            }
        }

        return response
    }

    private decodeImage(encryptionKey: string, image: ByteArray) {
        const streamSplit = encryptionKey.match(HEX_GROUP)

        if (streamSplit == null) throw new Error('Invalid image')

        const keyStream = streamSplit.map((x) => parseInt(x, 16))
        const blockSizeInBytes = keyStream.length

        return createRawData(image.map((value, i) => value ^ (keyStream[i % blockSizeInBytes] ?? 0)))
    }
}
