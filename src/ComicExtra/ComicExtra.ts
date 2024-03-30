import {
    Chapter,
    ChapterDetails,
    ContentRating,
    HomeSection,
    Manga,
    MangaUpdates,
    PagedResults,
    RequestManager,
    SearchRequest,
    Source,
    SourceInfo,
    TagType,
} from 'paperback-extensions-common'

import {Parser,} from './Parser'

const COMICEXTRA_DOMAIN = 'https://www.comicextra.com'

export const ComicExtraInfo: SourceInfo = {
    version: '2.0.1',
    name: 'ComicExtra',
    description: 'Extension that pulls western comics from comicextra.com',
    author: 'GameFuzzy',
    authorWebsite: 'http://github.com/gamefuzzy',
    icon: 'icon.png',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: COMICEXTRA_DOMAIN,
    sourceTags: [
        {
            text: 'Notifications',
            type: TagType.GREEN
        }
    ]
}

export class ComicExtra extends Source {

    parser = new Parser()

    requestManager: RequestManager = createRequestManager({
        requestsPerSecond: 5,
        requestTimeout: 20000
    })

    override getMangaShareUrl(mangaId: string): string {
        return `${COMICEXTRA_DOMAIN}/comic/${mangaId}`
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {

        const request = createRequestObject({
            url: `${COMICEXTRA_DOMAIN}/comic/${mangaId}`,
            method: 'GET'
        })
        const data = await this.requestManager.schedule(request, 1)

        const $ = this.cheerio.load(data.data)

        return this.parser.parseMangaDetails($, mangaId)
    }


    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: `${COMICEXTRA_DOMAIN}/comic/${mangaId}`,
            method: 'GET'
        })

        const data = await this.requestManager.schedule(request, 1)
        let $ = this.cheerio.load(data.data)

        let chapters: Chapter[] = []
        let pagesLeft = $('a', $('.general-nav')).toArray().length
        pagesLeft = pagesLeft == 0 ? 1 : pagesLeft

        while (pagesLeft > 0) {
            const pageRequest = createRequestObject({
                url: `${COMICEXTRA_DOMAIN}/comic/${mangaId}/${pagesLeft}`,
                method: 'GET'
            })
            const pageData = await this.requestManager.schedule(pageRequest, 1)
            $ = this.cheerio.load(pageData.data)
            chapters = chapters.concat(this.parser.parseChapterList($, mangaId))
            pagesLeft--
        }

        return this.parser.sortChapters(chapters)
    }


    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {

        let request = createRequestObject({
            url: `${COMICEXTRA_DOMAIN}/${mangaId}/${chapterId}/full`,
            method: 'GET',
        })

        let data = await this.requestManager.schedule(request, 1)

        const $ = this.cheerio.load(data.data)
        const unFilteredPages = this.parser.parseChapterDetails($)
        const pages: string[] = []

        const fallback = 'https://cdn.discordapp.com/attachments/549267639881695289/801836271407726632/fallback.png'
        // Fallback if empty
        if (unFilteredPages.length < 1) {
            pages.push(fallback)
        } else {
            // Filter out 404 status codes
            request = createRequestObject({
                url: `${unFilteredPages[0]}`,
                method: 'HEAD',
            })
            // Try/catch is because the testing framework throws an error on 404
            try {
                data = await this.requestManager.schedule(request, 1)
                if (data.status == 404) {
                    pages.push(fallback)
                } else {
                    for (const page of unFilteredPages) {
                        pages.push(page)
                    }
                }
            } catch {
                pages.push(fallback)
            }

        }

        return createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
            longStrip: false
        })
    }

    override async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {

        let loadNextPage = true
        let currPageNum = 1

        while (loadNextPage) {

            const request = createRequestObject({
                url: `${COMICEXTRA_DOMAIN}/comic-updates/${String(currPageNum)}`,
                method: 'GET'
            })

            const data = await this.requestManager.schedule(request, 1)
            const $ = this.cheerio.load(data.data)

            const updatedComics = this.parser.filterUpdatedManga($, time, ids)
            loadNextPage = updatedComics.loadNextPage
            if (loadNextPage) {
                currPageNum++
            }
            if (updatedComics.updates.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedComics.updates
                }))
            }
        }
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1

        const request = createRequestObject({
            url: `${COMICEXTRA_DOMAIN}/comic-search`,
            method: 'GET',
            param: `?key=${encodeURIComponent(query.title ?? '')}&page=${page}`
        })

        const data = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(data.data)
        const manga = this.parser.parseSearchResults($)
        let mData = undefined
        if (!this.parser.isLastPage($)) {
            mData = {page: (page + 1)}
        }

        return createPagedResults({
            results: manga,
            metadata: mData
        })

    }

    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {

        // Let the app know what the homesections are without filling in the data
        const popularSection = createHomeSection({id: '2', title: 'POPULAR COMICS', view_more: true})
        const recentSection = createHomeSection({id: '1', title: 'RECENTLY ADDED COMICS', view_more: true})
        const newTitlesSection = createHomeSection({id: '0', title: 'LATEST COMICS', view_more: true})
        sectionCallback(popularSection)
        sectionCallback(recentSection)
        sectionCallback(newTitlesSection)

        // Make the request and fill out available titles
        let request = createRequestObject({
            url: `${COMICEXTRA_DOMAIN}/popular-comic`,
            method: 'GET'
        })

        const popularData = await this.requestManager.schedule(request, 1)
        let $ = this.cheerio.load(popularData.data)

        popularSection.items = this.parser.parseHomePageSection($)
        sectionCallback(popularSection)

        request = createRequestObject({
            url: `${COMICEXTRA_DOMAIN}/recent-comic`,
            method: 'GET'
        })

        const recentData = await this.requestManager.schedule(request, 1)
        $ = this.cheerio.load(recentData.data)

        recentSection.items = this.parser.parseHomePageSection($)
        sectionCallback(recentSection)

        request = createRequestObject({
            url: `${COMICEXTRA_DOMAIN}/new-comic`,
            method: 'GET'
        })

        const newData = await this.requestManager.schedule(request, 1)
        $ = this.cheerio.load(newData.data)

        newTitlesSection.items = this.parser.parseHomePageSection($)
        sectionCallback(newTitlesSection)
    }


    override async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        let webPage = ''
        const page: number = metadata?.page ?? 1
        switch (homepageSectionId) {
            case '0': {
                webPage = `/new-comic/${page}`
                break
            }
            case '1': {
                webPage = `/recent-comic/${page}`
                break
            }
            case '2': {
                webPage = `/popular-comic/${page}`
                break
            }
            default:
                return Promise.resolve(createPagedResults({results: []}))
        }

        const request = createRequestObject({
            url: `${COMICEXTRA_DOMAIN}${webPage}`,
            method: 'GET'
        })

        const data = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(data.data)
        const manga = this.parser.parseHomePageSection($)
        let mData
        if (!this.parser.isLastPage($)) {
            mData = {page: (page + 1)}
        } else {
            mData = undefined  // There are no more pages to continue on to, do not provide page metadata
        }

        return createPagedResults({
            results: manga,
            metadata: mData
        })
    }

}
