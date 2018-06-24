class BaseError {
    constructor(message='') {
        this.message = message
        this.stack = (new Error()).stack
    }

    get name() {
        return this.constructor.getName()
    }

    toString() {
        const {name} = this
        if (this.message) {
            return `${name}: ${this.message}`
        }
        return name
    }
}

const define = (...names) => {
    let SuperClass = BaseError
    const lastArg = names[names.length - 1]
    if (typeof(lastArg) !== 'string') {
        SuperClass = lastArg
        names = names.slice(0, -1)
    }

    const errorClasses = names.map(name => {
        // Return previously defined error type.
        if (errorRegistry[name]) {
            return errorRegistry[name]
        }
        const errorClass = class extends SuperClass {}
        Object.defineProperty(errorClass, 'name', {
            configurable: true,
            value: name
        })
        errorClass.getName = () => name
        return errorClass
    })
    for (const errorClass of errorClasses) {
        errorRegistry[errorClass.getName()] = errorClass
        errorSet.add(errorClass)
    }
    return errorClasses
}

const noop = () => {}

class TryCatch {
    handlers = new Map()
    finallyHandler = noop
    finallyWithReturn = false

    constructor(tryFunc) {
        this.tryFunc = tryFunc
    }

    catch(...args) {
        const errorTypes = args.slice(0, -1)
        const handler = args[args.length - 1]
        if (errorTypes.length < 1 || typeof(handler) !== 'function') {
            throw new Error('Invalid arguments.')
        }
        const errorClasses = errorTypes.map(type => {
            const errorClass = (
                typeof(type) === 'string'
                ? errorRegistry[type]
                : type
            )
            if (!errorSet.has(errorClass)) {
                throw new Error('Invalid error type.')
            }
            return errorClass
        })
        this.handlers.set(new Set(errorClasses), handler)
        return this
    }

    finally(handler, {withReturn=false, autoRun=true}={}) {
        this.finallyHandler = handler
        this.finallyWithReturn = withReturn
        if (autoRun) {
            return this.run()
        }
    }

    run(...args) {
        const {tryFunc, finallyWithReturn} = this
        try {
            return tryFunc(...args)
        }
        catch (error) {
            const errorClass = error.constructor
            for (const [classSet, handler] of this.handlers.entries()) {
                if (classSet.has(errorClass)) {
                    return handler(error)
                }
            }
        }
        finally {
            const result = this.finallyHandler()
            if (finallyWithReturn) {
                return result
            }
        }
    }

    async async(...args) {
        // return await this.run(...args)
        const {tryFunc, finallyWithReturn} = this
        try {
            return await tryFunc(...args)
        }
        catch (error) {
            const errorClass = error.constructor
            for (const [classSet, handler] of this.handlers.entries()) {
                if (classSet.has(errorClass)) {
                    return await handler(error)
                }
            }
        }
        finally {
            const result = this.finallyHandler()
            if (finallyWithReturn) {
                return await result
            }
        }
    }
}

// Error registry
const errorRegistry = {}
const errorSet = new Set()


export {
    BaseError,
    define,
    errorRegistry as errors,
}
export default func => {
    return new TryCatch(func)
}
