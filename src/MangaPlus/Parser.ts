/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    Chapter,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
    SearchRequest
} from 'paperback-extensions-common'
import {MangaPlusResponse,
    Title} from './APIInterface'
import { COMPLETE_REGEX,
    LangCode,
    TitleList } from './MangaPlusHelper'

export class Parser {
    parseMangaDetails(data: Uint8Array, mangaId: string): Manga {
        const result = MangaPlusResponse.decode(data)

        if (result.success == null) {
            const error = result.error.englishPopup.body
            console.log(error)
            throw new Error(error)
        }

        const details = result.success.titleDetailView

        const title = details.title

        const isCompleted = COMPLETE_REGEX.test(details.nonAppearanceInfo)

        return createManga({
            id: mangaId,
            views: title.viewCount,
            rating: 0,
            titles: [title.name],
            author: title.author.replace(' / ', ', '),
            image: title.portraitImageUrl,
            status: isCompleted ? MangaStatus.COMPLETED : MangaStatus.ONGOING,
            desc: details.overview + '\n\n' + details.viewingPeriodDescription
        })
    }

    parseChapterList(data: Uint8Array, mangaId: string): Chapter[] {
        try {
            const result = MangaPlusResponse.decode(data)

            if (result.success == null) {
                const error = result.error.englishPopup.body
                console.log(error)
                throw new Error(error)
            }

            const details = result.success.titleDetailView

            const chapters = details.firstChapterList.concat(details.lastChapterList)

            return (
                chapters
                    .reverse()
                    // If subTitle is null, then the chapter time has expired
                    .filter((chapter) => chapter.subTitle != null)
                    .map((chapter) =>
                        createChapter({
                            mangaId,
                            id: `${chapter.chapterId}`,
                            chapNum: parseInt(chapter.name.substring(chapter.name.indexOf('#') + 1)) || -1,
                            langCode: LangCode[details.title.language] as LanguageCode,
                            name: `${chapter.name} - ${chapter.subTitle}`,
                            time: new Date(1000 * chapter.startTimeStamp)
                        })
                    )
            )
        } catch (error: any) {
            console.log(error.message)
            throw new Error(error.message)
        }
    }

    parseChapterDetails(data: Uint8Array): string[] {
        try {
            const result = MangaPlusResponse.decode(data)

            if (result.success == null) {
                const error = result.error.englishPopup.body
                console.log(error)
                throw new Error(error)
            }

            return result.success.mangaViewer.pages
                .filter((page) => page.page != null)
                .map((page) => {
                    const encryptionKey =
            page.page.encryptionKey == null
                ? ''
                : `&encryptionKey=${page.page.encryptionKey}`
                    return page.page.imageUrl + encryptionKey
                })
        } catch (error: any) {
            console.log(error.message)
            throw new Error(error.message)
        }
    }

    parseSearchResults(
        data: Uint8Array,
        languages: string[],
        query: SearchRequest
    ): MangaTile[] {
        try {
            const result = MangaPlusResponse.decode(data)

            if (result.success == null) {
                const error = result.error.englishPopup.body
                console.log(error)
                throw new Error(error)
            }

            if (result.success.titleDetailView != null) {
                const title = result.success.titleDetailView.title

                if (LangCode[title.language] && languages.includes(LangCode[title.language] ?? 'unknown')) {
                    return [
                        createMangaTile({
                            id: `${title.titleId}`,
                            image: title.portraitImageUrl,
                            title: createIconText({ text: title.name })
                        })
                    ]
                }
                return []
            }
            TitleList.set(
                result.success.allTitlesViewV2.allTitlesGroup
                    .flatMap((allTitlesGroup) => allTitlesGroup.titles)
                    .filter((title) =>
                        languages.includes(LangCode[title.language] ?? 'unknown')
                    )
            )

            return TitleList.get()
                .filter(title => this.filterSearchTitles(title, query))
                .map((title) =>
                    createMangaTile({
                        id: `${title.titleId}`,
                        image: title.portraitImageUrl,
                        title: createIconText({ text: title.name })
                    })
                )
        } catch (error: any) {
            console.log(error.message)
            throw new Error(error.message)
        }
    }

    filterSearchTitles(title: Title, query: SearchRequest): boolean {
        if (query.title!.trim().length > 0 && query.parameters?.['author']?.[0]) {
            return (
                title.name.toLowerCase()
                    .includes(query.title!.toLowerCase()) &&
                    title.author
                        .toLowerCase()
                        .includes(query.parameters?.['author']?.[0]?.toLowerCase())
            )
        }
        else {
            return (typeof query.parameters?.['author']?.[0] !== 'undefined' &&
                title.author
                    .toLowerCase()
                    .includes(query.parameters?.['author']?.[0]?.toLowerCase())) ||
                (query.title!.trim().length > 0 &&
                title.name
                    .toLowerCase()
                    .includes(query.title!.toLowerCase()))
        }
    }

    parsePopularSection(data: Uint8Array[], languages: string[]): MangaTile[] {
        const result = MangaPlusResponse.decode(data[0] ?? new Uint8Array(0))

        if (result.success == null) {
            const error = result.error.englishPopup.body
            console.log(error)
            throw new Error(error)
        }

        TitleList.set(
            result.success.titleRankingView.titles.filter((title) =>
                languages.includes(LangCode[title.language] ?? 'unknown')
            )
        )

        const titleList = TitleList.get()
        return titleList.map((title) =>
            createMangaTile({
                id: `${title.titleId}`,
                image: title.portraitImageUrl,
                title: createIconText({ text: title.name })
            })
        )
    }

    parseRecentUpdatesSection(
        data: Uint8Array[],
        languages: string[]
    ): MangaTile[] {
        const result = MangaPlusResponse.decode(data[0] ?? new Uint8Array(0))

        if (result.success == null) {
            const error = result.error.englishPopup.body
            console.log(error)
            throw new Error(error)
        }

        // Fetch all titles to get newer thumbnail urls at the interceptor.

        const popularResult = MangaPlusResponse.decode(data[1] ?? new Uint8Array(0))

        if (popularResult.success != null) {
            TitleList.set(
                popularResult.success.titleRankingView.titles.filter((title) =>
                    languages.includes(LangCode[title.language] ?? 'unknown')
                )
            )
        }

        const mangas = result.success.webHomeViewV3.groups
            .flatMap((group) => group.titleGroups)
            .flatMap((titleGroup) => titleGroup.titles)
            .map((title) => title.title)
            .filter((title) => languages.includes(LangCode[title.language] ?? 'unknown'))
            .map((title) =>
                createMangaTile({
                    id: `${title.titleId}`,
                    image: title.portraitImageUrl,
                    title: createIconText({ text: title.name })
                })
            )

        // Filter out duplicates by title
        return [...new Set(mangas.map((manga) => manga.title.text))].map(
            (title) => mangas.find((manga) => manga.title.text === title)!
        )
    }
}
