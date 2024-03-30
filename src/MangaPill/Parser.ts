/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {Chapter,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
    Tag,
    TagSection} from 'paperback-extensions-common'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const entities = require('entities')

export class Parser {

    parseMangaDetails($: any, mangaId: string): Manga {
        const titles = [this.decodeHTMLEntity( $('.lazy').attr('alt') ?? '')]
        const image = $('.lazy').attr('data-src')
        const summary = $('.text-sm.text--secondary').text().trim()

        let status = MangaStatus.ONGOING, released, rating = 0
        let tagArrayGenres: Tag[] = []
        let tagArrayFormat: Tag[] = []
        for (const obj of $('a[href*=genre]').toArray()) {
            const id = $(obj).attr('href')?.replace('/search?genre=', '').trim()
            const label = $(obj).text().trim()
            if (typeof id === 'undefined' || typeof label === 'undefined') continue
            tagArrayGenres = [...tagArrayGenres, createTag({id: id, label: $(obj).text().trim()})]
        }
        let i = 0
        for (const item of $('div', $('.grid.grid-cols-1.gap-3.mb-3')).toArray()) {
            const descObj = $('div', $(item))
            if (!descObj.html()) {
                continue
            }
            switch (i) {
                case 0: {
                    // Manga Type
                    tagArrayFormat = [...tagArrayFormat, createTag({
                        id: descObj.text().trim(),
                        label: descObj.text().trim().replace(/^\w/, (c: string) => c.toUpperCase())
                    })]
                    i++
                    continue
                }
                case 1: {
                    // Manga Status
                    if (descObj.text().trim().toLowerCase().includes('publishing')) {
                        status = MangaStatus.ONGOING
                    } else {
                        status = MangaStatus.COMPLETED
                    }
                    i++
                    continue
                }
                case 2: {
                    // Date of release
                    released = descObj.text().trim() ?? undefined
                    i++
                    continue
                }
                case 3: {
                    // Rating
                    rating = Number(descObj.text().trim().replace(' / 10', '')) ?? undefined
                    i++
                    continue
                }
            }
            i = 0
        }
        const tagSections: TagSection[] = [createTagSection({id: 'genres', label: 'Genres', tags: tagArrayGenres}),
            createTagSection({id: 'format', label: 'Format', tags: tagArrayFormat})]
        return createManga({
            id: mangaId,
            rating: rating,
            titles: titles,
            image: image ?? '',
            status: status,
            tags: tagSections,
            desc: this.decodeHTMLEntity(summary ?? ''),
            lastUpdate: released
        })
    }


    parseChapterList($: any, mangaId: string): Chapter[] {

        const chapters: Chapter[] = []

        for (const obj of $('.p-1').toArray()) {
            const chapterId = $(obj).attr('href')
            if (chapterId == 'Read Chapters') {
                continue
            }
            const chapName = $(obj).text()
            const chapVol = Number(chapName?.toLowerCase()?.match(/season \D*(\d*\.?\d*)/)?.pop())
            const chapNum = Number(chapName?.toLowerCase()?.match(/chapter \D*(\d*\.?\d*)/)?.pop())

            if (typeof chapterId === 'undefined') continue
            chapters.push(createChapter({
                id: chapterId,
                mangaId: mangaId,
                chapNum: Number.isNaN(chapNum) ? 0 : chapNum,
                volume: Number.isNaN(chapVol) ? 0 : chapVol,
                langCode: LanguageCode.ENGLISH,
                name: this.decodeHTMLEntity(chapName)
            }))
        }
        return chapters
    }


    parseChapterDetails($: any): string[] {
        const pages: string[] = []
        // Get all of the pages
        for (const obj of $('img', $('picture')).toArray()) {
            const page = $(obj).attr('data-src')
            if (typeof page === 'undefined') continue
            pages.push(page)
        }
        return pages
    }

    filterUpdatedManga($: any, time: Date, ids: string[]): { updates: string[], loadNextPage: boolean } {
        const foundIds: string[] = []
        let passedReferenceTime = false
        for (const item of $('div.flex.bg-color-bg-secondary.p-2.rounded').toArray()) {
            const id = $('a.inilne.block', item).attr('href')?.replace('/manga/', '') ?? ''
            const mangaTime = new Date($('time-ago', item).attr('datetime') ?? '')
            passedReferenceTime = mangaTime <= time
            if (!passedReferenceTime) {
                if (ids.includes(id)) {
                    foundIds.push(id)
                }
            } else break
        }
        if (!passedReferenceTime) {
            return {updates: foundIds, loadNextPage: true}
        } else {
            return {updates: foundIds, loadNextPage: false}
        }
    }

    parseSearchResults($: any): MangaTile[] {
        const mangaTiles: MangaTile[] = []
        const collectedIds: string[] = []
        for (const obj of $('div', $('.grid.gap-3')).toArray()) {
            const id = $('a', $(obj)).attr('href')?.replace('/manga/', '')
            const titleText = this.decodeHTMLEntity($('a', $('div', $(obj))).text())

            const image = $('img', $('a', $(obj))).attr('data-src')

            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if (!collectedIds.includes(id)) {
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: titleText}),
                    image: image
                }))
                collectedIds.push(id)
            }
        }
        return mangaTiles
    }

    parseTags($: any): TagSection[] {
        const tagSections: TagSection[] = [createTagSection({id: 'genres', label: 'Genres', tags: []}),
            createTagSection({id: 'format', label: 'Format', tags: []}), createTagSection({id: 'status', label: 'Status', tags: []})]

        for (const obj of $('.grid.gap-1 input').toArray()) {
            const label = $(obj).parent().text().trim()

            const id = ('&genre=' + $(obj).attr('value') ?? label).replace(/\s/g, '+')
            tagSections[0]!.tags = [...tagSections[0]?.tags ?? [], createTag({id, label})]
        }

        for (const obj of $('select#type option:not([value=""])').toArray()) {
            let label = $(obj).text().trim()

            // Capitalize first letter
            label = label.charAt(0).toUpperCase() + label.slice(1)

            const id = ('&type=' + $(obj).attr('value') ?? label)
            tagSections[1]!.tags = [...tagSections[1]?.tags ?? [], createTag({id, label})]
        }

        for (const obj of $('select#status option:not([value=""])').toArray()) {
            let label = $(obj).text().trim()

            // Capitalize first letter
            label = label.charAt(0).toUpperCase() + label.slice(1)
            const id = ('&status=' + $(obj).attr('value') ?? label).replace(/\s/g, '+')
            tagSections[2]!.tags = [...tagSections[2]?.tags ?? [], createTag({id, label})]
        }
        return tagSections
    }

    parseFeaturedSection($ : any): MangaTile[]{
        const mangaTiles: MangaTile[] = []
        for(const obj of $('div.my-6 .featured-grid .rounded').toArray()) {
            const id        = $('a:nth-child(2)', obj).attr('href')?.replace('/manga/', '')
            const titleText = this.decodeHTMLEntity($('a:nth-child(2)', obj).text().trim())
            const image     = $('a img', obj).attr('data-src') ?? ''

            const collectedIds: string[] = []
            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if(!collectedIds.includes(id)) {
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: titleText}),
                    image: image
                }))
                collectedIds.push(id)
            }
        }
        return mangaTiles
    }

    parseRecentUpdatesSection($: any): MangaTile[] {
        const mangaTiles: MangaTile[] = []
        const collectedIds: string[] = []

        for (const obj of $('div.grid div:not([class])').toArray()) {
            const id        = $('a.text-secondary', obj).attr('href')?.replace('/manga/', '')
            const titleText = this.decodeHTMLEntity($('a.text-secondary', obj).text().trim())
            const image     = $('a figure img', obj).attr('data-src')

            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if (!collectedIds.includes(id)) {
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: titleText}),
                    image: image
                }))
                collectedIds.push(id)
            }
        }
        return mangaTiles
    }

    isLastPage($: any): boolean {
        return $('a:contains("Next")').length < 1
    }

    decodeHTMLEntity(str: string): string {
        return str.replace(/&#(\d+);/g, (_match, dec) => {
            return entities.decodeHTML(String.fromCharCode(dec))
        })
    }
}
