# typed-try-catch

Try-catch alternative providing a syntactically slim way to catch errors by type.

## Why?

Catching generals exception (i.e. errors without regarding their type) is potentially a bad idea (quote from [this StackOverflow answer](https://stackoverflow.com/a/1743018/6928824)):

> Swallowing exceptions is a dangerous practice because:

> - It can cause the user to think something succeeded when it actually failed.
> - It can put your application into states that you didn't plan for.
> - It complicates debugging, since it's much harder to find out where the failure happened when you're dealing with bizarre/broken behavior instead of a stack trace.

> As you can probably imagine, some of these outcomes can be extremely catastrophic, so doing this right is an important habbit.

The [V8 `try-catch` optimization problem](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#2-unsupported-syntax) (for `V8 < 5.3`) is nice side effect of using this package.


## Installation

```bash
npm install --save typed-try-catch
```

```bash
yarn add typed-try-catch
```

## Usage

```javascript
import attempt, {define} from 'typed-try-catch'

const [NetworkError, ReadError, AuthError] = define('NetworkError', 'ReadError', 'AuthError')

attempt(() => {
    connectAndReadFromDb()
})
.catch(NetworkError, error => {
    console.warn('could not connect')
})
.catch(ReadError, AuthError, error => {
    console.warn('could not read from db')
})
.finally(() => {
    ensureDbClosed()
})
```

Back in the old days we would have written this like so:

```javascript
try {
    connectAndReadFromDb()
}
catch (error) {
    switch (error.constructor) {
        case NetworkError:
            console.warn('could not connect')
            break
        case ReadError:
        case AuthError:
            console.warn('could not read from db')
            break
        default:
            throw error
    }
}
finally {
    ensureDbClosed()
}
```

Async usage is also supported.
For more detail see the [tests](https://github.com/jneuendorf/typed-try-catch/blob/master/src/typed-try-catch.spec.js).


## Related

- https://github.com/JsCommunity/make-error
