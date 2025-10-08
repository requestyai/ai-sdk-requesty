import { describe, expect, it } from 'vitest'
import { handleSystemCompletion } from './handle-system-completion'

describe('handleSystemCompletion', () => {
    it('converts system message to string', () => {
        const result = handleSystemCompletion({
            role: 'system',
            content: 'You are a helpful assistant.',
        })

        expect(result).toBe('You are a helpful assistant.')
    })

    it('handles empty system message', () => {
        const result = handleSystemCompletion({
            role: 'system',
            content: '',
        })

        expect(result).toBe('')
    })

    it('handles system message with newlines', () => {
        const result = handleSystemCompletion({
            role: 'system',
            content: 'Line 1\nLine 2\nLine 3',
        })

        expect(result).toBe('Line 1\nLine 2\nLine 3')
    })
})
