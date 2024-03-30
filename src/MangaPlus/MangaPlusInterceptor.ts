import {
    Request,
    RequestInterceptor,
    Response,
} from 'paperback-extensions-common'
import {uuid} from './Utility'

export class MangaPlusInterceptor implements RequestInterceptor {
    interceptors: RequestInterceptor[]

    async interceptRequest(request: Request): Promise<Request> {

        request.headers = {
            ...(request.headers ?? {}),
            ...{
                'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
                'session-token': uuid()
            }
        }

        for (const interceptor of this.interceptors) {
            request = await interceptor.interceptRequest(request)
        }
        return request
    }
    async interceptResponse(response: Response): Promise<Response> {
        for (const interceptor of this.interceptors) {
            response = await interceptor.interceptResponse(response)
        }
        return response
    }
    constructor(interceptors: RequestInterceptor[]) {
        this.interceptors = interceptors
    }
}
