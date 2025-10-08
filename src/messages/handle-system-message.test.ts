import { describe, expect, it } from 'vitest'
import { handleSystemMessage } from './handle-system-message'

describe('system messages', () => {
    it('converts system message', () => {
        const systemMessage = handleSystemMessage({
            role: 'system',
            content: 'hello world',
        })

        expect(systemMessage).toStrictEqual({
            content: 'hello world',
            role: 'system',
        })
    })
})
