import { Title } from './APIInterface'

export class TitleList {
    private static titleList: Title[] = []
  
    static get(): Title[] {
        return TitleList.titleList
    }
  
    static set(list: Title[]): void {
        TitleList.titleList = list
    }
}

export const LangCode: string[] = [
    'en', 'es', 'fr', 'id', 'pt', 'ru', 'th'
]

export const MANGAPLUS_DOMAIN = 'https://mangaplus.shueisha.co.jp'
export const API_DOMAIN = 'https://jumpg-webapi.tokyo-cdn.com/api'
export const TITLE_THUMBNAIL_PATH = 'title_thumbnail_portrait_list'
export const COMPLETE_REGEX = /completado|complete/
export const ID_REGEX = /\\d+/
export const HEX_GROUP = /.{1,2}/g

export const PopularRequest = {
    url: `${API_DOMAIN}/title_list/ranking`,
    method: 'GET',
    headers: {
        referer: `${MANGAPLUS_DOMAIN}/manga_list/hot`
    }
}

export const LatestUpdatesRequest = {
    url: `${API_DOMAIN}/web/web_homeV3?lang=eng`,
    method: 'GET',
    headers: {
        referer: `${MANGAPLUS_DOMAIN}/updates`
    }
}