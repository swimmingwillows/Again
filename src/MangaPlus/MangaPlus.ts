/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    Chapter,
    ChapterDetails,
    HomeSection,
    Manga,
    PagedResults,
    SearchRequest,
    Source,
    SourceInfo,
    TagType,
    ContentRating,
    Section,
    Request,
    MangaUpdates
} from 'paperback-extensions-common'

import {
    MANGAPLUS_DOMAIN,
    API_DOMAIN,
    LatestUpdatesRequest,
    PopularRequest,
    ID_REGEX
} from './MangaPlusHelper'

import {
    contentSettings,
    getLanguages,
    getResolution,
    getSplitImages,
    resetSettings
} from './MangaPlusSettings'

import { Parser } from './Parser'
import { URLBuilder } from './Utility'
import { MangaPlusInterceptor } from './MangaPlusInterceptor'
import { ImageInterceptor,
    ThumbnailInterceptor } from './interceptors'


export const MangaPlusInfo: SourceInfo = {
    version: '1.0.3',
    name: 'MangaPlus',
    description: 'Extension that pulls licensed manga from MangaPlus.',
    author: 'GameFuzzy',
    authorWebsite: 'https://github.com/gamefuzzy',
    icon: 'icon.png',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: MANGAPLUS_DOMAIN,
    sourceTags: [
        {
            text: 'Notifications',
            type: TagType.GREEN
        }
    ]
}

export class MangaPlus extends Source {
    parser = new Parser()

    stateManager = createSourceStateManager({})

    requestManager = createRequestManager({
        requestsPerSecond: 5,
        requestTimeout: 20000,
        interceptor: new MangaPlusInterceptor([
            new ImageInterceptor(),
            new ThumbnailInterceptor()
        ])
    })

    override getMangaShareUrl(mangaId: string): string {
        return `${MANGAPLUS_DOMAIN}/titles/${mangaId}`
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `${API_DOMAIN}/title_detail`,
            method: 'GET',
            param: `?title_id=${mangaId}`
        })
        const response = await this.requestManager.schedule(request, 1)

        const data = createByteArray(response.rawData)

        return this.parser.parseMangaDetails(data, mangaId)
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: `${API_DOMAIN}/title_detail`,
            method: 'GET',
            param: `?title_id=${mangaId}`
        })
        const response = await this.requestManager.schedule(request, 1)

        const data = createByteArray(response.rawData)

        return this.parser.parseChapterList(data, mangaId)
    }

    async getChapterDetails(
        mangaId: string,
        chapterId: string
    ): Promise<ChapterDetails> {
        try {
            const request = createRequestObject({
                url: new URLBuilder(API_DOMAIN)
                    .addPathComponent('manga_viewer')
                    .addQueryParameter('chapter_id', chapterId)
                    .addQueryParameter(
                        'split',
                        (await getSplitImages(this.stateManager))
                    )
                    .addQueryParameter(
                        'img_quality',
                        (await getResolution(this.stateManager))
                            .toLowerCase()
                            .replace(' ', '_')
                    )
                    .buildUrl(),
                headers: {
                    referer: `${MANGAPLUS_DOMAIN}/viewer/${chapterId}`
                },
                method: 'GET'
            })

            const response = await this.requestManager.schedule(request, 1)

            const data = createByteArray(response.rawData)
            const pages = this.parser.parseChapterDetails(data)

            return createChapterDetails({
                id: chapterId,
                mangaId: mangaId,
                pages: pages,
                longStrip: false
            })
        }
        catch (error: any) {
            console.log(error.message)
            throw new Error(error.message)
        }
    }

    override async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, _time: Date, ids: string[]): Promise<void> {
        mangaUpdatesFoundCallback(createMangaUpdates({ids}))
    }

    async getSearchResults(
        query: SearchRequest,
        metadata: any
    ): Promise<PagedResults> {
        try{
            if(!metadata) {
                let id
                if (query.parameters && query.parameters['id'] && query.parameters['id'][0]) {
                    id = query.parameters['id'][0].match(ID_REGEX)
                }

                if (id && id[0]) {
                    const manga = await this.getMangaDetails(id[0])

                    return createPagedResults({
                        results: [
                            createMangaTile({
                                id: `${id[0]}`,
                                image: manga.image,
                                title: createIconText({text: manga.titles[0] ?? ''})
                            })
                        ],
                        metadata: {
                            manga: [],
                            offset: 0
                        }
                    })
                }
                const request = createRequestObject({
                    url: `${API_DOMAIN}/title_list/allV2`,
                    method: 'GET',
                    headers: {
                        referer: `${MANGAPLUS_DOMAIN}/manga_list/all`
                    }
                })

                const response = await this.requestManager.schedule(request, 1)

                const data = createByteArray(response.rawData)
                const results = this.parser.parseSearchResults(data, await getLanguages(this.stateManager), query)
                metadata = {
                    manga: results,
                    offset: 0
                }
            }
            return createPagedResults({
                results: metadata.manga.slice(metadata.offset, metadata.offset + 100),
                metadata: {
                    manga: metadata.manga,
                    offset: metadata.offset + 100
                }
            })
        }
        catch (error: any) {
            console.log(error.message)
            throw new Error(error.message)
        }
    }

    override async getHomePageSections(
        sectionCallback: (section: HomeSection) => void
    ): Promise<void> {
        const languages = await getLanguages(this.stateManager)

        const sections = [
            {
                requests: [createRequestObject(PopularRequest)],
                section: createHomeSection({
                    id: 'popular',
                    title: 'Popular',
                    view_more: true
                })
            },
            {
                requests: [
                    createRequestObject(LatestUpdatesRequest),
                    createRequestObject(PopularRequest)
                ],
                section: createHomeSection({
                    id: 'latest',
                    title: 'Latest Updates',
                    view_more: true
                })
            }
        ]

        const promises: Promise<void>[] = []

        for (const section of sections) {
            // Let the app load empty sections
            sectionCallback(section.section)
            // Get the section data
            promises.push(
                Promise.all(
                    section.requests.map((request) =>
                        this.requestManager.schedule(request, 1)
                    )
                ).then(async (responses) => {
                    const data = responses.map((response) =>
                        createByteArray(response.rawData)
                    )
                    switch (section.section.id) {
                        case 'popular':
                            section.section.items = this.parser
                                .parsePopularSection(data, languages)
                                .slice(0, 20)
                            break
                        case 'latest': {
                            section.section.items = this.parser
                                .parseRecentUpdatesSection(data, languages)
                                .slice(0, 20)
                        }
                    }
                    sectionCallback(section.section)
                })
            )
        }

        // Make sure the function completes
        await Promise.all(promises)
    }

    override async getViewMoreItems(
        homepageSectionId: string,
        metadata: any
    ): Promise<PagedResults> {
        try {
            if(!metadata) {
                let results
                switch (homepageSectionId) {
                    case 'popular': {
                        const requests = [createRequestObject(PopularRequest)]

                        const responses = await Promise.all(
                            requests.map((request) => this.requestManager.schedule(request, 1))
                        )
                        const data = responses.map((response) =>
                            createByteArray(response.rawData)
                        )

                        results = this.parser.parsePopularSection(data, await getLanguages(this.stateManager))

                        break
                    }
                    case 'latest': {
                        const requests = [
                            createRequestObject(LatestUpdatesRequest),
                            createRequestObject(PopularRequest)
                        ]

                        const responses = await Promise.all(
                            requests.map((request) => this.requestManager.schedule(request, 1))
                        )
                        const data = responses.map((response) =>
                            createByteArray(response.rawData)
                        )

                        results = this.parser.parseRecentUpdatesSection(data, await getLanguages(this.stateManager))
                        break
                    }
                    default:
                        return Promise.resolve(createPagedResults({results: []}))
                }
                metadata = {
                    manga: results,
                    offset: 0
                }
            }

            return createPagedResults({
                results: metadata.manga.slice(metadata.offset, metadata.offset + 100),
                metadata: {
                    manga: metadata.manga,
                    offset: metadata.offset + 100
                }
            })
        }
        catch (error: any) {
            console.log(error.message)
            throw new Error(error.message)
        }
    }

    override async getSourceMenu(): Promise<Section> {
        return Promise.resolve(
            createSection({
                id: 'main',
                header: 'Source Settings',
                rows: () =>
                    Promise.resolve([
                        contentSettings(this.stateManager),
                        resetSettings(this.stateManager)
                    ])
            })
        )
    }

    override getCloudflareBypassRequest(): Request {
        return createRequestObject({
            url: `${MANGAPLUS_DOMAIN}`,
            method: 'GET'
        })
    }
}
