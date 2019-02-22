import attempt, {BaseError, define, errors} from './typed-try-catch'


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

    test('bubbling errors when uncaught', () => {
        const [ErrorA, ErrorB, ErrorC] = define('ErrorA', 'ErrorB', 'ErrorC')
        const instance = (
            attempt(() => {
                throw new ErrorC('Uncaught ErrorC')
            })
            .catch(ErrorA, ErrorB, error => {
                return error.message
            })
        )
        expect(() => instance.run()).toThrow('Uncaught ErrorC')
    })

    test('native errors', () => {
        const instance = (
            attempt(error => {
                throw error
            })
            .catch(ReferenceError, error => {
                return error.message
            })
            .catch('EvalError', error => {
                return error.message
            })
            // Defined errors are prioritized over globals.
            // Thus this catch block will NOT match the native 'TypError'.
            .catch('TypeError', error => {
                return error.message
            })
        )
        expect(instance.run(new ReferenceError('ReferenceError'))).toBe('ReferenceError')
        expect(instance.run(new EvalError('EvalError'))).toBe('EvalError')
        expect(instance.run(new errors.TypeError('TypeError'))).toBe('TypeError')
    })

    test('try-catch-else', () => {
        let executedBlocks = []
        attempt(() => {
            executedBlocks.push('try')
            throw new Error('message')
        })
        .catch(Error, error => {
            executedBlocks.push('catch')
        })
        .else(error => {
            executedBlocks.push('else')
        })
        .finally(() => {
            executedBlocks.push('finally')
        })
        expect(executedBlocks).toEqual(['try', 'catch', 'finally'])

        executedBlocks = []
        attempt(() => {
            executedBlocks.push('try')
            // not throwing
        })
        .catch(Error, error => {
            executedBlocks.push('catch')
        })
        .else(error => {
            executedBlocks.push('else')
        })
        .finally(() => {
            executedBlocks.push('finally')
        })
        expect(executedBlocks).toEqual(['try', 'else', 'finally'])

        // Errors in 'else' should bubble up.
        const [CustomError] = define('CustomError')
        let error
        try {
            attempt(() => {
                executedBlocks.push('try')
                // not throwing
            })
            .catch(Error, error => {
                executedBlocks.push('catch')
            })
            .else(error => {
                executedBlocks.push('else')
                throw new CustomError('Oops')
            })
            .run()
        }
        catch (err) {
            error = err
        }
        expect(error).toBeInstanceOf(CustomError)
    })

    test('async usage', async () => {
        const [ErrorA, ErrorB, ErrorC] = define('ErrorA', 'ErrorB', 'ErrorC')
        const instance = (
            attempt(error => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => reject(error), 10)
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
            .else(() => {
                throw new Error('This should not be run.')
            })
            .finally(() => null, {autoRun: false, withReturn: false})
        )
        expect(await instance.async(new ErrorA('ErrorA'))).toBe('ErrorA')
        expect(await instance.async(new ErrorB('ErrorB'))).toBe('ErrorB')
        expect(await instance.async(new ErrorC('ErrorC'))).toBe('ErrorC')

        let result = await (
            attempt(() => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => resolve('all good'), 10)
                })
            })
            // Reference error types using strings.
            .catch('ErrorA', error => {
                return error.message
            })
            .else(() => {
                return 'else all good'
            })
            .finallyAsync(() => null)
        )
        expect(result).toBe('else all good')

        result = await (
            attempt(() => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => resolve('all good'), 10)
                })
            })
            .catch('ErrorA', error => {
                return error.message
            })
            .finallyAsync(() => 'finally', {withReturn: true})
        )
        expect(result).toBe('finally')
    })

    test('bubbling errors when uncaught (async)', () => {
        const [ErrorA, ErrorB, ErrorC] = define('ErrorA', 'ErrorB', 'ErrorC')
        const instance = (
            attempt(() => {
                throw new ErrorC('Uncaught ErrorC')
            })
            .catch(ErrorA, ErrorB, error => {
                return error.message
            })
        )
        try {
            instance.async()
        }
        catch (error) {
            expect(error.message).toBe('Uncaught ErrorC')
        }
    })

    test('coverage :)', () => {
        expect(`${new BaseError()}`).toBe('BaseError')
        expect(`${new BaseError('message')}`).toBe('BaseError: message')

        expect(() => {
            attempt(() => 1).catch()
        }).toThrow('Invalid arguments')
        expect(() => {
            attempt(() => 1).catch(() => 'HandlerButNoErrorType')
        }).toThrow('Invalid arguments')
        expect(() => {
            attempt(() => 1).catch('ErrorTypeButNoHandler')
        }).toThrow('Invalid arguments')

        expect(() => {
            attempt(() => 1).catch('ThisTypeHasNotBeenDefined', () => 'handle it')
        }).toThrow('Invalid error type')
    })

    describe('edge cases', () => {
        test('finally with explicit return', () => {
            const withoutFinallyReturn = attempt(() => {
                return 1
            })
            .finally(() => {
                return 2
            })
            expect(withoutFinallyReturn).toBe(1)

            const withFinallyReturn = attempt(() => {
                return 1
            })
            .finally(() => {
                return 2
            }, {withReturn: true})

            expect(withFinallyReturn).toBe(2)
        })

        test('try-catch-else with return (unlike python)', () => {
            const elseBlock = attempt(() => {
                return 1
            })
            .catch(Error, error => {
                return 2
            })
            .else(error => {
                return 3
            })
            .run()
            expect(elseBlock).toBe(3)

            const catchBlock = attempt(() => {
                throw new Error('Error')
            })
            .catch(Error, error => {
                return 2
            })
            .else(error => {
                return 3
            })
            .run()

            expect(catchBlock).toBe(2)
        })
    })

})
