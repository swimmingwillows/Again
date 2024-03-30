import {
    Button,
    NavigationButton,
    SourceStateManager
} from 'paperback-extensions-common'
import { LangCode } from './MangaPlusHelper'

export const getLanguages = async (
    stateManager: SourceStateManager
): Promise<string[]> => {
    return (await stateManager.retrieve('languages') as string[]) ?? ['en']
}

export const getSplitImages = async (
    stateManager: SourceStateManager
): Promise<string> => {
    return (await stateManager.retrieve('split_images') as string) ?? 'yes'
}

export const getResolution = async (
    stateManager: SourceStateManager
): Promise<string> => {
    return (
        (await stateManager.retrieve('image_resolution') as string) ?? 'High'
    )
}

export const contentSettings = (
    stateManager: SourceStateManager
): NavigationButton => {
    return createNavigationButton({
        id: 'content_settings',
        value: '',
        label: 'Content Settings',
        form: createForm({
            onSubmit: (values: any) => {
                return Promise.all([
                    stateManager.store('languages', values.languages),
                    stateManager.store('split_images', values.split_images ? 'yes' : 'no'),
                    stateManager.store('image_resolution', values.image_resolution[0])
                ]).then()
            },
            validate: () => {
                return Promise.resolve(true)
            },
            sections: () => {
                return Promise.resolve([
                    createSection({
                        id: 'content',
                        rows: () => {
                            return Promise.all([
                                getLanguages(stateManager),
                                getSplitImages(stateManager),
                                getResolution(stateManager)
                            ]).then(async (values) => {
                                return [
                                    createSelect({
                                        id: 'languages',
                                        label: 'Languages',
                                        options: LangCode,
                                        displayLabel: (option) => {
                                            switch (option) {
                                                case 'en':
                                                    return 'English'

                                                case 'es':
                                                    return 'Español'

                                                case 'fr':
                                                    return 'French'

                                                case 'id':
                                                    return 'Bahasa (IND)'

                                                case 'pt':
                                                    return 'Portugûes (BR)'

                                                case 'ru':
                                                    return 'Русский'

                                                case 'th':
                                                    return 'ภาษาไทย'

                                                default:
                                                    return ''
                                            }
                                        },
                                        value: values[0],
                                        allowsMultiselect: true,
                                        minimumOptionCount: 1
                                    }),
                                    createSwitch({
                                        id: 'split_images',
                                        label: 'Split double pages',
                                        value: values[1] == 'yes'
                                    }),
                                    createSelect({
                                        id: 'image_resolution',
                                        label: 'Image resolution',
                                        options: ['Low', 'High', 'Super High'],
                                        displayLabel: (option) => option,
                                        value: [values[2]]
                                    })
                                ]
                            })
                        }
                    })
                ])
            }
        })
    })
}

export const resetSettings = (stateManager: SourceStateManager): Button => {
    return createButton({
        id: 'reset',
        label: 'Reset to Default',
        value: '',
        onTap: () => {
            return Promise.all([
                stateManager.store('languages', null),
                stateManager.store('split_images', null),
                stateManager.store('image_resolution', null)
            ])
        }
    })
}
