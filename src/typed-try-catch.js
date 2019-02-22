class BaseError {
    constructor(message='') {
        this.message = message
        this.stack = (new Error()).stack
    }

    get name() {
        return this.constructor.name
    }

    toString() {
        const {name, message} = this
        if (message) {
            return `${name}: ${message}`
        }
        return name
    }
}


const globalObject = (
    typeof(global) !== 'undefined'
    ? global
    : window
)
const noop = () => {}
// https://stackoverflow.com/a/18939541/6928824
// Additionally, we return 'false' for 'null'/'undefined'.
const isSubclass = (sub, sup) => {
    return sub && (sub.prototype instanceof sup || sub === sup)
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
        definedErrors.add(errorClass)
    }
    return errorClasses
}


class TryCatch {
    handlers = new Map()
    elseHandler = noop
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
                ? (errorRegistry[type] || globalObject[type])
                : type
            )
            if (!definedErrors.has(errorClass) && !isSubclass(errorClass, Error)) {
                throw new Error('Invalid error type.')
            }
            return errorClass
        })
        this.handlers.set(new Set(errorClasses), handler)
        return this
    }

    else(handler) {
        this.elseHandler = handler
        return this
    }

    finally(handler, {withReturn=false, autoRun=true}={}) {
        this.finallyHandler = handler
        this.finallyWithReturn = withReturn
        if (autoRun === true) {
            return this.run()
        }
        else {
            return this
        }
    }

    // This is a convenience method for '.finally(..., {autoRun: false}).async()'.
    // Since it is async it does not make sense to have the 'autoRun' flag.
    async finallyAsync(handler, {withReturn=false}={}) {
        this.finallyHandler = handler
        this.finallyWithReturn = withReturn
        return await this.async()
    }

    run(...args) {
        const {
            tryFunc,
            handlers,
            elseHandler,
            finallyHandler,
            finallyWithReturn,
        } = this
        let errorWasThrown = false
        try {
            return tryFunc(...args)
        }
        catch (error) {
            errorWasThrown = true
            const errorClass = error.constructor
            for (const [classSet, handler] of handlers.entries()) {
                if (classSet.has(errorClass)) {
                    return handler(error)
                }
            }
            throw error
        }
        finally {
            // https://stackoverflow.com/a/128829/6928824
            try {
                if (!errorWasThrown && elseHandler !== noop) {
                    const result = elseHandler()
                    if (!finallyWithReturn) {
                        return result
                    }

                }
            }
            finally {
                if (finallyHandler !== noop) {
                    const result = finallyHandler()
                    if (finallyWithReturn) {
                        return result
                    }
                }
            }
        }
    }

    // Code needs to be duplicated because try-catch compiles different in an
    // async function. :/
    async async(...args) {
        const {
            tryFunc,
            handlers,
            elseHandler,
            finallyHandler,
            finallyWithReturn,
        } = this
        let errorWasThrown = false
        try {
            return await tryFunc(...args)
        }
        catch (error) {
            errorWasThrown = true
            const errorClass = error.constructor
            for (const [classSet, handler] of handlers.entries()) {
                if (classSet.has(errorClass)) {
                    return await handler(error)
                }
            }
            throw error
        }
        finally {
            try {
                if (!errorWasThrown && elseHandler !== noop) {
                    const result = await elseHandler()
                    if (!finallyWithReturn) {
                        return result
                    }

                }
            }
            finally {
                if (finallyHandler !== noop) {
                    const result = await finallyHandler()
                    if (finallyWithReturn) {
                        return result
                    }
                }
            }
        }
    }
}


const errorRegistry = {}
const definedErrors = new Set()


export {
    BaseError,
    define,
    errorRegistry as errors,
}
export default func => {
    return new TryCatch(func)
}
