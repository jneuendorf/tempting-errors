import attempt, {BaseError, define} from './typed-try-catch'


// https://stackoverflow.com/a/18939541/6928824
const isSubclass = (sub, sup) => {
    return sub.prototype instanceof sup || sub === sup
}

describe('defining error types', () => {
    test('simple', () => {
        const [TypeError, ValueError] = define('TypeError', 'ValueError')

        expect(TypeError).not.toBe(ValueError)
        expect(isSubclass(TypeError, BaseError)).toBe(true)
        expect(TypeError.name).toBe('TypeError')
        expect(TypeError.getName()).toBe('TypeError')

        const typeError = new TypeError()
        expect(typeError.name).toBe('TypeError')
        expect(typeof(typeError.stack)).toBe('string')
    })

    test('hierarchical', () => {
        const [IOError] = define('IOError')
        const [ReadError, WriteError] = define('ReadError', 'WriteError', IOError)
        expect(isSubclass(IOError, BaseError)).toBe(true)
        expect(isSubclass(ReadError, IOError)).toBe(true)
        expect(isSubclass(WriteError, IOError)).toBe(true)
        expect(isSubclass(ReadError, WriteError)).toBe(false)
        expect(isSubclass(WriteError, ReadError)).toBe(false)
    })
})

describe('typed try catch', () => {
    test('basic usage', () => {
        const [ErrorA, ErrorB, ErrorC] = define('ErrorA', 'ErrorB', 'ErrorC')
        const instance = (
            attempt(error => {
                throw error
            })
            // Reference error types directly.
            .catch(ErrorA, ErrorB, error => {
                return error.message
            })
            // Reference error types using strings.
            .catch('ErrorC', error => {
                return error.message
            })
        )
        expect(instance.run(new ErrorA('ErrorA'))).toBe('ErrorA')
        expect(instance.run(new ErrorB('ErrorB'))).toBe('ErrorB')
        expect(instance.run(new ErrorC('ErrorC'))).toBe('ErrorC')
    })

    test('async usage', async () => {
        const [ErrorA, ErrorB, ErrorC] = define('ErrorA', 'ErrorB', 'ErrorC')
        const instance = (
            attempt(error => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => reject(error), 100)
                })
            })
            // Reference error types directly.
            .catch(ErrorA, ErrorB, error => {
                return error.message
            })
            // Reference error types using strings.
            .catch('ErrorC', error => {
                return error.message
            })
        )
        expect(await instance.async(new ErrorA('ErrorA'))).toBe('ErrorA')
        expect(await instance.async(new ErrorB('ErrorB'))).toBe('ErrorB')
        expect(await instance.async(new ErrorC('ErrorC'))).toBe('ErrorC')
    })

    test('edge cases', () => {
        const withoutFinallyReturn = attempt(() => {
            return 1
        })
        .finally(() => {
            return 2
        })
        const withFinallyReturn = attempt(() => {
            return 1
        })
        .finally(() => {
            return 2
        }, {withReturn: true})

        expect(withoutFinallyReturn).toBe(1)
        expect(withFinallyReturn).toBe(2)
    })
})
