// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { Message,
    Type,
    Field } from 'protobufjs/light'

export enum Action {
    DEFAULT,
    UNAUTHORIZED,
    MAINTAINENCE,
    GEOIP_BLOCKING,
}

export enum Language {
    ENGLISH,
    SPANISH,
    FRENCH,
    INDONESIAN,
    PORTUGESE_BR,
    RUSSIAN,
    THAI,
}

export enum UpdateTiming {
    NOT_REGULARLY,
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY,
    SUNDAY,
    DAY,
}

@Type.d('Chapter')
export class Chapter extends Message<Chapter> {
    @Field.d(1, 'int32', 'required')
    public titleId: number

    @Field.d(2, 'int32', 'required')
    public chapterId: number

    @Field.d(3, 'string', 'required')
    public name: string

    @Field.d(4, 'string', 'optional', null)
  
    public subTitle: string

    @Field.d(6, 'int32', 'required')
    public startTimeStamp: number

    @Field.d(7, 'int32', 'required')
    public endTimeStamp: number
}

@Type.d('Popup')
export class Popup extends Message<Popup> {
    @Field.d(1, 'string', 'required')
    public subject: string

    @Field.d(2, 'string', 'required')
    public body: string
}

@Type.d('ErrorResult')
export class ErrorResult extends Message<ErrorResult> {
    @Field.d(1, Action, 'required')
    public action: Action

    @Field.d(2, Popup, 'required')
    public englishPopup: Popup

    @Field.d(3, Popup, 'required')
    public spanishPopup: Popup
}

@Type.d('MangaPage')
export class MangaPage extends Message<MangaPage> {
    @Field.d(1, 'string', 'required')
    public imageUrl: string

    @Field.d(2, 'int32', 'required')
    public width: number

    @Field.d(3, 'int32', 'required')
    public height: number

    @Field.d(5, 'string', 'optional', null)
    public encryptionKey: string
}

@Type.d('MangaPlusPage')
export class MangaPlusPage extends Message<MangaPlusPage> {
    @Field.d(1, MangaPage, 'optional', null)
    public page: MangaPage
}

@Type.d('Title')
export class Title extends Message<Title> {
    @Field.d(1, 'int32', 'required')
    public titleId: number

    @Field.d(2, 'string', 'required')
    public name: string

    @Field.d(3, 'string', 'required')
    public author: string

    @Field.d(4, 'string', 'required')
    public portraitImageUrl: string

    @Field.d(5, 'string', 'required')
    public landscapeImageUrl: string

    @Field.d(6, 'int32', 'optional', 0)
    public viewCount: number

    @Field.d(7, Language, 'optional', Language.ENGLISH)
    public language: Language
}

@Type.d('UpdatedTitle')
export class UpdatedTitle extends Message<UpdatedTitle> {
    @Field.d(1, Title, 'required')
    public title: Title
}

@Type.d('OriginalTitleGroup')
export class OriginalTitleGroup extends Message<OriginalTitleGroup> {
    @Field.d(1, 'string', 'required')
    public theTitle: string

    @Field.d(3, UpdatedTitle, 'repeated', [])
    public titles: UpdatedTitle[]
}

@Type.d('UpdatedTitleV2Group')
export class UpdatedTitleV2Group extends Message<UpdatedTitleV2Group> {
    @Field.d(1, 'string', 'required')
    public groupName: string

    @Field.d(2, OriginalTitleGroup, 'repeated', [])
    public titleGroups: OriginalTitleGroup[]
}

@Type.d('TitleRankingView')
export class TitleRankingView extends Message<TitleRankingView> {

    @Field.d(1, Title, 'repeated', [])
    public titles: Title[]
}

@Type.d('TitleDetailView')
export class TitleDetailView extends Message<TitleDetailView> {
    @Field.d(1, Title, 'required')
    public title: Title

    @Field.d(2, 'string', 'required')
    public titleImageUrl: string

    @Field.d(3, 'string', 'required')
    public overview: string

    @Field.d(4, 'string', 'required')
    public backgroundImageUrl: string

    @Field.d(5, 'int32', 'optional', 0)
    public nextTimeStamp: number

    @Field.d(6, UpdateTiming, 'optional', UpdateTiming.DAY)
    public updateTiming: UpdateTiming

    @Field.d(7, 'string', 'optional', '')
    public viewingPeriodDescription: string

    @Field.d(8, 'string', 'optional', '')
    public nonAppearanceInfo: string

    @Field.d(9, Chapter, 'repeated', [])
    public firstChapterList: Chapter[]

    @Field.d(10, Chapter, 'repeated', [])
    public lastChapterList: Chapter[]

    @Field.d(14, 'bool', 'optional', true)
    public isSimulReleased: boolean

    @Field.d(17, 'bool', 'optional', true)
    public chaptersDescending: boolean
}

@Type.d('MangaViewer')
export class MangaViewer extends Message<MangaViewer> {
    @Field.d(1, MangaPlusPage, 'repeated', [])
    public pages: MangaPlusPage[]
}

@Type.d('AllTitlesGroup')
export class AllTitlesGroup extends Message<AllTitlesGroup> {
    @Field.d(1, 'string', 'required')
    public theTitle: string

    @Field.d(2, Title, 'repeated', [])
    public titles: Title[]
}

@Type.d('AllTitlesViewV2')
export class AllTitlesViewV2 extends Message<AllTitlesViewV2> {
    @Field.d(1, AllTitlesGroup, 'repeated', [])
    public allTitlesGroup: AllTitlesGroup[]
}

@Type.d('WebHomeViewV3')
export class WebHomeViewV3 extends Message<WebHomeViewV3> {
    @Field.d(2, UpdatedTitleV2Group, 'repeated', [])
    public groups: UpdatedTitleV2Group[]
}

@Type.d('SuccessResult')
export class SuccessResult extends Message<SuccessResult> {
    @Field.d(1, 'bool', 'optional', false)
    public isFeaturedUpdated: boolean

    @Field.d(6, TitleRankingView, 'optional', null)
    public titleRankingView: TitleRankingView

    @Field.d(8, TitleDetailView, 'optional', null)
    public titleDetailView: TitleDetailView

    @Field.d(10, MangaViewer, 'optional', null)
    public mangaViewer: MangaViewer

    @Field.d(25, AllTitlesViewV2, 'optional', null)
    public allTitlesViewV2: AllTitlesViewV2

    @Field.d(31, WebHomeViewV3, 'optional', null)
    public webHomeViewV3: WebHomeViewV3
}

@Type.d('MangaPlusResponse')
export class MangaPlusResponse extends Message<MangaPlusResponse> {
    @Field.d(1, SuccessResult, 'optional', null)
    public success: SuccessResult

    @Field.d(2, ErrorResult, 'optional', null)
    public error: ErrorResult
}
