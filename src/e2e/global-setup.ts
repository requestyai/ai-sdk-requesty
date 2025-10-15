import { getTestModels } from './get-models'

const models = getTestModels()

export default function setup() {
    console.log('='.repeat(80))
    console.log('Running models:')
    models.forEach((m) => {
        console.log(m.id)
    })
    console.log('='.repeat(80))
}
