import type {
    SharedV2ProviderMetadata,
    SharedV2ProviderOptions,
} from '@ai-sdk/provider'

const REQUESTY = 'requesty'
const REASONING_SIGNATURE = 'reasoning_signature'

type WithProviderOptions = {
    providerOptions?: SharedV2ProviderOptions | undefined
}

type WithProviderMetadata = {
    providerMetadata?: SharedV2ProviderMetadata | undefined
}

// we read `providerOptions` when converting to Requesty messages
// but the SDK assigns `providerOptions` to the value of `providerMetadata`
// presumably because we don't have a `providerOptions` here.
//
// https://github.com/vercel/ai/blob/756edf9672d95cd884449fa9ec9e9c08bf4bd5f6/packages/ai/src/generate-text/to-response-messages.ts#L37

export const maybeSetReasoningContent = <T extends WithProviderMetadata>(
    obj: T,
    reasoningSignature?: string | null,
) => {
    if (!reasoningSignature) {
        return
    }

    const metadata = obj.providerMetadata
    if (!metadata) {
        obj.providerMetadata = {}
    }

    if (!obj.providerMetadata!.requesty) {
        obj.providerMetadata![REQUESTY] = {}
    }

    obj.providerMetadata = {
        ...obj.providerMetadata,
        [REQUESTY]: {
            ...obj.providerMetadata!.requesty,
            [REASONING_SIGNATURE]: reasoningSignature,
        },
    }
}

export const maybeGetReasoningContent = <T extends WithProviderOptions>(
    obj: T | undefined,
): string | undefined => {
    if (!obj) {
        return
    }

    if (!obj.providerOptions) {
        return
    }

    if (!(REQUESTY in obj.providerOptions)) {
        return
    }

    const reasoningSignature =
        obj.providerOptions![REQUESTY][REASONING_SIGNATURE]
    if (typeof reasoningSignature !== 'string') {
        return
    }

    return reasoningSignature
}
