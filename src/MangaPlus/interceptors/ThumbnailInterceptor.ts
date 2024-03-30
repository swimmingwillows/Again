import {
    Request,
    RequestInterceptor,
    Response,
} from 'paperback-extensions-common'
import { TITLE_THUMBNAIL_PATH,
    TitleList } from '../MangaPlusHelper'
import {Title} from '../APIInterface'

export class ThumbnailInterceptor implements RequestInterceptor {
    requestManager = createRequestManager({
        requestsPerSecond: 5,
        requestTimeout: 20000,
    })

    async interceptRequest(request: Request): Promise<Request> {
        return request
    }
    async interceptResponse(response: Response): Promise<Response> {
        const isBadCode = response.status == 401 || response.status == 404

        const url = response.request.url
        if (isBadCode && url.includes(TITLE_THUMBNAIL_PATH)) {
            const titleId = parseInt(url.split(`/${TITLE_THUMBNAIL_PATH}`)[0]?.split('/').pop() ?? '')

            const title = 
        TitleList.get().find(
            (title: Title) => title.titleId == titleId
        )
            if(!title) return response

            const request = createRequestObject({
                url: title.portraitImageUrl,
                method: 'GET',
                headers: response.request.headers,
            })

            return await this.requestManager.schedule(request, 1)
        }

        return response
    }
}
