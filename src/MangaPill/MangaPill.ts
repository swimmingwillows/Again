import {
    Chapter,
    ChapterDetails,
    ContentRating,
    HomeSection,
    Manga,
    MangaUpdates,
    PagedResults,
    SearchRequest,
    Source,
    SourceInfo,
    TagSection,
    TagType,
    Request,
    HomeSectionType
} from 'paperback-extensions-common'

import { Parser } from './Parser'

const MANGAPILL_DOMAIN = 'https://www.mangapill.com'

export const MangaPillInfo: SourceInfo = {
    version: '2.1.2',
    name: 'MangaPill',
    description: 'Extension that pulls manga from mangapill.com. It has a lot of officially translated manga but can sometimes miss manga notifications',
    author: 'GameFuzzy',
    authorWebsite: 'http://github.com/gamefuzzy',
    icon: 'icon.png',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: MANGAPILL_DOMAIN,
    sourceTags: [
        {
            text: 'Notifications',
            type: TagType.GREEN
        },
        {
            text: 'Cloudflare',
            type: TagType.RED
        }
    ]
}

export class MangaPill extends Source {
    parser = new Parser()

    requestManager = createRequestManager({
        requestsPerSecond: 5,
        requestTimeout: 20000
    })

    override getMangaShareUrl(mangaId: string): string {
        return `${MANGAPILL_DOMAIN}/manga/${mangaId}`
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `${MANGAPILL_DOMAIN}/manga/${mangaId}`,
            method: 'GET'
        })
        const data = await this.requestManager.schedule(request, 1)

        const $ = this.cheerio.load(data.data)

        return this.parser.parseMangaDetails($, mangaId)
    }


    async getChapters(mangaId: string): Promise<Chapter[]> {
        const pageRequest = createRequestObject({
            url: `${MANGAPILL_DOMAIN}/manga/${mangaId}`,
            method: 'GET'
        })
        const pageData = await this.requestManager.schedule(pageRequest, 1)
        const $ = this.cheerio.load(pageData.data)

        return this.parser.parseChapterList($, mangaId)
    }


    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = createRequestObject({
            url: `${MANGAPILL_DOMAIN}${chapterId}`,
            method: 'GET',
        })

        const data = await this.requestManager.schedule(request, 1)

        const $ = this.cheerio.load(data.data)
        const pages = this.parser.parseChapterDetails($)

        return createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
            longStrip: false
        })
    }

    override async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
        const request = createRequestObject({
            url: `${MANGAPILL_DOMAIN}/chapters`,
            method: 'GET'
        })

        const data = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(data.data)

        const updatedManga = this.parser.filterUpdatedManga($, time, ids)

        if (updatedManga.updates.length > 0) {
            mangaUpdatesFoundCallback(createMangaUpdates({
                ids: updatedManga.updates
            }))
        }
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1
        const tags: string = (query.includedTags
            ?.map(tag => tag.id) ?? []).join('')

        const request = createRequestObject({
            url: `${MANGAPILL_DOMAIN}/search`,
            method: 'GET',
            param: encodeURI(`?q=${query.title ?? ''}${tags}&page=${page}`)
        })

        const data = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(data.data)
        const manga = this.parser.parseSearchResults($)
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


    override async getSearchTags(): Promise<TagSection[]> {
        const request = createRequestObject({
            url: `${MANGAPILL_DOMAIN}/search`,
            method: 'GET'
        })

        const data = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(data.data)

        return this.parser.parseTags($)
    }


    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const sections = [
            {
                request: createRequestObject({
                    url: MANGAPILL_DOMAIN,
                    method: 'GET'
                }),
                section: createHomeSection({
                    id: 'featured',
                    title: 'Featured',
                    type: HomeSectionType.featured,
                }),
            },
            {
                request: createRequestObject({
                    url: `${MANGAPILL_DOMAIN}/chapters`,
                    method: 'GET'
                }),
                section: createHomeSection({
                    id: 'latest',
                    title: 'Latest Updates',
                    view_more: true,
                }),
            }
        ]

        const promises: Promise<void>[] = []

        for (const section of sections) {
            // Let the app load empty sections
            sectionCallback(section.section)

            // Get the section data
            promises.push(
                this.requestManager.schedule(section.request, 1).then(response => {
                    const $ = this.cheerio.load(response.data)
                    switch(section.section.id) {
                        case 'latest':
                            section.section.items = this.parser.parseRecentUpdatesSection($)
                            break
                        case 'featured':
                            section.section.items = this.parser.parseFeaturedSection($)
                    }
                    sectionCallback(section.section)
                }),
            )
        }

        // Make sure the function completes
        await Promise.all(promises)
    }

    override async getViewMoreItems(_: string, metadata: any): Promise<PagedResults> {
        if (!metadata) {
            const request = createRequestObject({
                url: `${MANGAPILL_DOMAIN}/chapters`,
                method: 'GET'
            })

            const data = await this.requestManager.schedule(request, 1)
            const $ = this.cheerio.load(data.data)

            metadata = {
                data: this.parser.parseRecentUpdatesSection($),
                offset: 0
            }
        }

        const manga = metadata.data.slice(metadata.offset, metadata.offset + 20)

        metadata.offset += 20

        return createPagedResults({
            results: manga,
            metadata
        })
    }

    override getCloudflareBypassRequest(): Request {
        return createRequestObject({
            url: `${MANGAPILL_DOMAIN}`,
            method: 'GET',
        })
    }

}
