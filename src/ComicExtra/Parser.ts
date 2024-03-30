import {Chapter,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
    Tag,
    TagSection} from 'paperback-extensions-common'

const COMICEXTRA_DOMAIN = 'https://www.comicextra.com'

export class Parser {

    
    parseMangaDetails($: any, mangaId: string): Manga {
    

        const titles = [$('.title-1', $('.mobile-hide')).text().trimLeft()]
        const image = $('img', $('.movie-l-img')).attr('src')

        const summary = $('#film-content', $('#film-content-wrapper')).text().trim()
        const relatedIds: string[] = []
        for(const obj of $('.list-top-item').toArray()) {
            relatedIds.push($('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '').trim() || '')
        }

        let status = MangaStatus.ONGOING, author, released
        const rating = 0

        let tagArray0 : Tag[] = []
        let i = 0
        for (const item of $('.movie-dd', $('.movie-dl')).toArray()) {
            switch (i) {
                case 0: {
                    // Comic Status
                    if ($('a', $(item)).text().toLowerCase().includes('ongoing')) {
                        status = MangaStatus.ONGOING
                    }
                    else {
                        status = MangaStatus.COMPLETED
                    }
                    i++
                    continue
                }
                case 1: {
                    // Alt Titles
                    if($(item).text().toLowerCase().trim() == '-') {
                        i++
                        continue
                    }
                    titles.push($(item).text().trim())
                    i++
                    continue
                }
                case 2: {
                    // Date of release
                    released = ($(item).text().trim()) ?? undefined
                    i++
                    continue
                }
                case 3: {
                    // Author
                    author = ($(item).text().trim()) ?? undefined
                    i++
                    continue
                }
                case 4: {
                    // Genres
                    for(const obj of $('a',$(item)).toArray()){
                        const id = $(obj).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/`, '').trim()
                        const label = $(obj).text().trim()
                        if (typeof id === 'undefined' || typeof label === 'undefined') continue
                        tagArray0 = [...tagArray0, createTag({id: id, label: label})]
                    }    
                    i++
                    continue
                }
            }
            i = 0
        }
        const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: tagArray0 })]
        return createManga({
            id: mangaId,
            rating: rating,
            titles: titles,
            image: image ?? '',
            status: status,
            author: this.decodeHTMLEntity(author ?? ''),
            tags: tagSections,
            desc: this.decodeHTMLEntity(summary ?? ''),
            lastUpdate: released,
            relatedIds: relatedIds
        })
    }


    parseChapterList($: any, mangaId: string) : Chapter[] {
    
        const chapters: Chapter[] = []

        for(const obj of $('tr', $('#list')).toArray()) {
            const chapterId = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/${mangaId}/`, '')
            let chapNum = chapterId?.replace('chapter-', '').trim()
            if(isNaN(Number(chapNum))){
                chapNum = `0.${chapNum?.replace( /^\D+/g, '')}`
                if(isNaN(Number(chapNum))){
                    chapNum = '0'
                }
            }
            const chapName = $('a', $(obj)).text()
            const time = $($('td', $(obj)).toArray()[1]).text()
            if (typeof chapterId === 'undefined') continue
            chapters.push(createChapter({
                id: chapterId,
                mangaId: mangaId,
                chapNum: Number(chapNum),
                langCode: LanguageCode.ENGLISH,
                name: this.decodeHTMLEntity(chapName),
                time: new Date(time)
            }))
        }
        return chapters
    }


    sortChapters(chapters: Chapter[]) : Chapter[] {
        const sortedChapters: Chapter[] = []
        chapters.forEach((c) => {
            if (sortedChapters[sortedChapters.indexOf(c)]?.id !== c?.id) {
                sortedChapters.push(c)
            }
        })
        sortedChapters.sort((a, b) => (a.id > b.id) ? 1 : -1)
        return sortedChapters
    }


    parseChapterDetails($: any) : string[] {
        const pages: string[] = []
        // Get all of the pages
        for(const obj of $('img',$('.chapter-container')).toArray()) {
            const page = $(obj).attr('src')
            if(typeof page === 'undefined') continue  
            pages.push(page)
        }
        return pages
    }

    filterUpdatedManga($: any, time: Date, ids: string[] ) : {updates: string[], loadNextPage : boolean} {
    
        const foundIds: string[] = []
        let passedReferenceTime = false
        for (const item of $('.hlb-t').toArray()) {
            const id = ($('a', item).first().attr('href') ?? '')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')!.trim() ?? ''
            let mangaTime = new Date(time)
            if($('.date', item).first().text().trim().toLowerCase() === 'yesterday') {
                mangaTime = new Date(Date.now())
                mangaTime.setDate(new Date(Date.now()).getDate() - 1)
            }
            else {
                mangaTime = new Date($('.date', item).first().text()) 
            }
            passedReferenceTime = mangaTime <= time
            if (!passedReferenceTime) {
                if (ids.includes(id)) {
                    foundIds.push(id)
                }
            }
            else break
        }
        if(!passedReferenceTime) {
            return {updates: foundIds, loadNextPage: true}
        }
        else {
            return {updates: foundIds, loadNextPage: false}
        }

    
    }

    parseSearchResults($: any): MangaTile[] {
        const mangaTiles: MangaTile[] = []
        const collectedIds: string[] = []
        for(const obj of $('.cartoon-box').toArray()) {
            const id = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')
            const titleText = this.decodeHTMLEntity($('h3', $(obj)).text())
            const image = $('img', $(obj)).attr('src')
      
            if(titleText == 'Not found') continue // If a search result has no data, the only cartoon-box object has "Not Found" as title. Ignore.
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

    parseHomePageSection($ : any): MangaTile[]{
        
        const tiles: MangaTile[] = []
        const collectedIds: string[] = []
        for(const obj of $('.cartoon-box').toArray()) {
            const id = $('a', $(obj)).attr('href')?.replace(`${COMICEXTRA_DOMAIN}/comic/`, '')
            const titleText = this.decodeHTMLEntity($('h3', $(obj)).text().trim())
            const image = $('img', $(obj)).attr('src')

            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if(!collectedIds.includes(id)) {
                tiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: titleText}),
                    image: image
                }))
                collectedIds.push(id)
            }
        }
        return tiles
    }
    isLastPage($: any): boolean {
        for(const obj of $('a', $('.general-nav')).toArray()) {
            if($(obj).text().trim().toLowerCase() == 'next') {
                return false
            }
        }
        return true
    }
    
    decodeHTMLEntity(str: string): string {
        return str.replace(/&#(\d+);/g, (_match, dec) => {
            return String.fromCharCode(dec)
        })
    }
}
