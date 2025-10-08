export default {
    arrowParens: 'always',
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
    singleAttributePerLine: true,
    jsxSingleQuote: true,
    proseWrap: 'never',
    plugins: ['@ianvs/prettier-plugin-sort-imports'],
    importOrder: [
        '<TYPES>',
        '<TYPES>^[@/]',
        '<TYPES>^[./|../]',
        '',

        '<BUILTIN_MODULES>',
        '<THIRD_PARTY_MODULES>',
        '',

        '^[../]',
        '^[./]',
    ],
    importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
}
