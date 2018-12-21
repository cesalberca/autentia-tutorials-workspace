#

El mundo frontend es conocido por su gran volatilidad, sin embargo poco hacemos para que esta volatilidad no afecte a nuestros desarrollos. Nos importa últimamente estar más a la última del framework del momento que de aprender técnicas para escribir nuestro código de tal forma que nos costase muy poco cambiarlo. Así que este tutorial irá en pos de hacer una aplicación lo más "Frameworkless" posible.

## Problema

Nuestro usuario tiene el siguiente problema: dado que su aplicación Web es altamente interactiva y hace uso de técnicas como carga de datos en diferido es necesario mostrar inicialmente una luz en gris, en el momento en que comienza una petición se motrará una luz en azul, si la petición actual ha ido bien mostrar una luz en verde y si no una luz en rojo. Si se vuelve a peticionar algo ya antes peticionado se volverá a mostrar la luz azul.

El usuario prevée que querrá añadir algún aviso sobre algunas peticiones que sean destructivas, como el borrado de una entidad, y además querría mostrar la luz en ambar.

Por supuesto nuestro usuario necesita que todas las peticiones se comporten así, pudiendo en alguno lugares añadir gestiones más especiales para capturar errores más específicos.

Además es necesario recuperar los datos de la petición.

## Solución

### Chain of responsability

Le gestión de una petición asíncrona tiene que ir pasando por una serie de estados: __inicio de la petición__, __respuesta de la petición__ que a su vez se divide en: __petición resuelta con éxito__ y __petición fallida__. Y además este ciclo es lineal. Incluso se podría decir que es una _cadena_.

Para este tipo de gestiones existe un patrón de diseño llamado [chain of responsability](https://en.wikipedia.org/wiki/Chain-of-responsibility_pattern) que lo que pretende es gestionar el procesamiento de objetos siendo cada objeto el que tenga la lógica de procesado. Es decir, este patrón nos puede ahorrar un montón de `if` y `else`s, haciendo cumplir el principio de [Open/Closed](https://codeburst.io/understanding-solid-principles-open-closed-principle-e2b588b6491f) de [SOLID](https://scotch.io/bar-talk/s-o-l-i-d-the-first-five-principles-of-object-oriented-design) (abierto a la extensión, cerrado a la modificación).

¡Así que vamos a ello! Vamos a empezar por la interfaz `Handler`:

```ts
export interface Handler<T> {
  next: (context: T) => void
  setNext: (handler: Handler<T>) => void
}
```

Esta describe dos métodos. El primero es una función que invocará el siguiente handler de la cadena, pudiendo pasar un objeto `context`. Este `context` nos servirá para ir realizando las operaciones pertinentes sobre la petición que ya veremos más adelante.

El método `setNext` nos permite definir el siguiente objeto de la cadena, recibiéndo a su vez un `Handler`.

Ahora bien, ¿cómo sería la implementación de un `Handler`? Pues sería algo tal que así:

```ts
import { Handler } from './Handler'
import { RequestEmptyHandler } from './RequestEmptyHandler'
import { RequestHandlerContext } from './RequestHandler'

export class RequestStartHandler<T> implements Handler<RequestHandlerContext<T>> {
  private nextHandler: Handler<RequestHandlerContext<T>> = new RequestEmptyHandler()

  public async next(context: RequestHandlerContext<T>) {
    context.state.setEmptyState()
    context.state.currentState.isLoading = true
    await this.nextHandler.next(context)
  }

  public setNext(handler: Handler<RequestHandlerContext<T>>) {
    this.nextHandler = handler
  }
}
```

En el método `next` tendremos la gestión del comienzo de una petición, dado que tiene que pasar lo siguiente:

* Resetear el estado a vacío
* Poner el estado a cargando
* Invocar al siguiente elemento de la cadena

También vemos que se da un valor por defecto al `nextHandler` que es el `RequestEmptyHandler`. Este handler vacío lo que hace es... nada. Este es el handler por si en algún momento se intenta llamar al `next` del último handler. ¿Su implementación? De las más sencillas:

```ts
import { Handler } from './Handler'
import { RequestHandlerContext } from './RequestHandler'

export class RequestEmptyHandler<T> implements Handler<RequestHandlerContext<T>> {
  public async next() {}

  public setNext() {}
}
```

Como hemos dicho antes, después de la petición hay una respuesta, que a su vez sería un `Handler`. Aunque este `Handler` es a su vez un poco especial, dado que debe poder gestionar una respuesta con éxito o una respuesta fallida:

```ts
import { Handler } from './Handler'
import { RequestErrorHandler } from './RequestErrorHandler'
import { RequestSuccessHandler } from './RequestSuccessHandler'
import { RequestEmptyHandler } from './RequestEmptyHandler'
import { RequestHandlerContext } from './RequestHandler'

export class RequestResponseHandler<T> implements Handler<RequestHandlerContext<T>> {
  private nextHandler: Handler<RequestHandlerContext<T>> = new RequestEmptyHandler()

  private requestErrorHandler: Handler<RequestHandlerContext<T>> = new RequestErrorHandler<T>()
  private requestSuccessHandler: Handler<RequestHandlerContext<T>> = new RequestSuccessHandler<T>()

  constructor() {
    this.requestErrorHandler.setNext(new RequestEmptyHandler<T>())
    this.requestSuccessHandler.setNext(new RequestEmptyHandler<T>())
  }

  public async next(context: RequestHandlerContext<T>) {
    try {
      context.response.value = await context.request
      this.setNext(this.requestSuccessHandler)
      await this.nextHandler.next(context)
    } catch (e) {
      this.setNext(this.requestErrorHandler)
      await this.nextHandler.next(context)
    } finally {
      // Esta línea de código es muy interesante, ya que... ¿En qué momento se ejecuta?
      context.state.currentState.isLoading = false
    }
  }

  public setNext(handler: Handler<RequestHandlerContext<T>>) {
    this.nextHandler = handler
  }
}
```

Aquí vemos varias cosas, dentro de este `Handler` tenemos un `RequestErrorHandler` y un `RequestSuccessHandler`, y es en el `next` donde determina qué camino ha de seguir y una vez lo ha decidido invoca al `next`. Cómo todos los `Handler`s implementan la misma interfaz aquí vemos la magia del polimorfismo, donde a esta clase poco le importa cuál sea el siguiente `Handler`, este se preocupa de elegir el camino correcto, ya serán el resto de `Handlers` quienes determinen qué tienen que hacer (esto hace que sigamos la S de [SOLID](https://en.wikipedia.org/wiki/SOLID))(Single responsability principle).

Y además vemos algo muy interesante, en el `finally` decimos que `context.state.currentState.isLoading` se ponga a `false`. Pero si vemos un poco más arriba, hacemos `await` de la llamada al siguiente handler, lo que quiere decir esto que estamos __mutando el estado una vez se ha ejecuta el siguiente handler__. Esto nos puede venir de perlas si no quisiésemos parar la ejecución del programa o si quisiésemos ejecutar algo a posteriori a modo de "limpieza". En este caso una vez resuelto la petición con éxito o con error, queremos que se cambie el estado a cargado.

La clase de éxito de la petición es `RequestSuccessHandler`:

```ts
import { Handler } from './Handler'
import { RequestEmptyHandler } from './RequestEmptyHandler'
import { RequestHandlerContext } from './RequestHandler'

export class RequestSuccessHandler<T> implements Handler<RequestHandlerContext<T>> {
  private nextHandler: Handler<RequestHandlerContext<T>> = new RequestEmptyHandler()

  public async next(context: RequestHandlerContext<T>) {
    context.state.currentState.hasSuccess = true
    await this.nextHandler.next(context)
  }

  public setNext(handler: Handler<RequestHandlerContext<T>>) {
    this.nextHandler = handler
  }
}
```

Y la de error es `RequestErrorHandler`:

```ts
import { Handler } from './Handler'
import { RequestEmptyHandler } from './RequestEmptyHandler'
import { RequestHandlerContext } from './RequestHandler'

export class RequestErrorHandler<T> implements Handler<RequestHandlerContext<T>> {
  private nextHandler: Handler<RequestHandlerContext<T>> = new RequestEmptyHandler()

  public async next(context: RequestHandlerContext<T>) {
    context.state.currentState.hasError = true
    context.response.hasError = true
    await this.nextHandler.next(context)
  }

  public setNext(handler: Handler<RequestHandlerContext<T>>) {
    this.nextHandler = handler
  }
}
```

Ahora nos queda la última pieza... ¿Quién orquesta todo? Pues el `RequestHandler`:

```ts
import { Handler } from './Handler'
import { RequestStartHandler } from './RequestStartHandler'
import { RequestEmptyHandler } from './RequestEmptyHandler'
import { State } from '../State'
import { RequestResponseHandler } from './RequestResponseHandler'
import { Request } from '../Request'

export type RequestHandlerContext<T> = {
  state: State
  request: Promise<T>
  response: Request.Payload<T>
}

export class RequestHandler<T> {
  private requestStartHandler: Handler<RequestHandlerContext<T>> = new RequestStartHandler()

  constructor(private readonly state: State) {
    const requestResponseHandler: Handler<RequestHandlerContext<T>> = new RequestResponseHandler<T>()
    const requestEmptyHandler: Handler<RequestHandlerContext<T>> = new RequestEmptyHandler<T>()

    this.requestStartHandler.setNext(requestResponseHandler)
    requestResponseHandler.setNext(requestEmptyHandler)
  }

  public async trigger(request: Promise<T>): Promise<Request.Success<T> | Request.Fail> {
    const response: Request.Payload<T> = {
      hasError: false,
      value: null
    }

    await this.requestStartHandler.next({ state: this.state, request, response })

    if (response.hasError) {
      return new Request.Fail()
    }
    return new Request.Success(response.value as T)
  }
}
```

Aquí básicamente creamos la cadena de `Handlers`, les decimos a cada uno cual es su siguiente y exponemos a los clientes un método sobre el que pueden iniciar la cadena, que es el método `trigger`, el cual recibir una promesa, que es la petición. El `trigger` además retorna los valores.

### Proxy

Ahora tenemos un problema, el lector atento habrá visto que en el objeto `context` hemos empezado a cambiar un objeto `state` tal que así:

```ts
context.state.currentState.isLoading = false
```

Pero claro, ¿cómo hacemos para que nuestra vista se renderice una vez el estado cambia? Porque según nuestra historia de usuario tenemos que representar varios estados del cargando.

Sin cargar:

![](./../imgs/frontend-patterns/light-none.png)

Cargando:

![](./../imgs/frontend-patterns/light-loading.png)

Éxito:

![](./../imgs/frontend-patterns/light-success.png)

Error:

![](./../imgs/frontend-patterns/light-error.png)

Esto podemos hacerlo con un Proxy, que será donde guardemos el estado. En este Proxy, podremos capturar todas las mutaciones de sus valores. Y teniendo esto, solamente nos hace falta conectar los componentes de nuestra aplicación con este estado.

```ts
import { State } from './State'

export class StateManager  {
  public state: State

  public constructor() {
    this.state = new Proxy(this.getEmptyState(), {
      set: (
        target: State,
        p: PropertyKey,
        value: any,
        receiver: any
      ): boolean => {
        Reflect.set(target, p, value, receiver)
        return true
      }
    })
  }

  public getEmptyState(): State {
    return {
      isLoading: false,
      hasError: false,
      hasSuccess: false,
      users: []
    }
  }

  public setEmptyState(): void {
    this.state.isLoading = false
    this.state.hasError = false
    this.state.hasSuccess = false
    this.state.users = []
  }
}
```

Ahora cada vez que mutemos el estado del `StateManager` podremos lanzar acciones, que serán _observadas_.

### Observador

Ahora bien, necesitamos exponer al mundo una forma de poder _observar_ estos cambios en el estado. Ahí entra el patrón obsevador. Empezamos por el sujeto:

```ts
import { Observer } from './Observer'

export interface Subject {
  register: (observer: Observer) => void
  notifyAll: () => void
  // También podríamos dar de baja observadores
}
```

Y el observador:

```ts
export interface Observer {
  notify: () => void
}
```

Y si lo hilamos todo junto al `StateManager`:

```ts
import { Subject } from './Subject'
import { Observer } from './Observer'
import { State } from './State'

export class StateManager implements Subject {
  private readonly _observers: Observer[] = []

  public state: State

  public constructor() {
    this.state = new Proxy(this.getEmptyState(), {
      set: (
        target: State,
        p: PropertyKey,
        value: any,
        receiver: any
      ): boolean => {
        Reflect.set(target, p, value, receiver)
        this.notifyAll()
        return true
      }
    })
  }

  public getEmptyState(): State {
    return {
      isLoading: false,
      hasError: false,
      hasSuccess: false,
      users: []
    }
  }

  public setEmptyState(): void {
    this.state.isLoading = false
    this.state.hasError = false
    this.state.hasSuccess = false
    this.state.users = []
  }

  public notifyAll() {
    this._observers.forEach(observer => observer.notify())
  }

  public register(observer: Observer) {
    this._observers.push(observer)
  }
}
```

Nos quedaría únicamente definir los observadores, pero eso lo veremos más adelante.

## Singleton

Si pensamos el caso de uso del estado, tendría sentido dos instancias o más de `StateManager`. La respuesta es no, debería haber un único estado en la aplicación. Para evitar crear instancias de más tenemos el patrón [Singleton](https://en.wikipedia.org/wiki/Singleton_pattern). Para ello añadimos un campo a la clase llamado `instance`:

```ts
class StateManager implements Subject {
    private static _instance: StateManager | null = null
}
```

Añadimos un getter del campo privado `_instance` dónde gestionamos su creación un única vez:

```ts
export class StateManager implements Subject {
    private static _instance: StateManager | null = null

    public static get instance() {
    if (this._instance === null) {
      this._instance = new StateManager()
    }

    return this._instance
  }
}
```

Por último cambiamos la visibilidad del constructor de pública a privada, para que únicamente se pueda obtener la instancia de la clase por el getter `instance`.

## React

En la vista he optado por usar React. Con lo cual tendremos el componente `Light` que tendrá el siguiente contenido:

```tsx
import React, { Component } from 'react'

export type LightStates = 'loading' | 'error' | 'success' | 'none'

interface Props {
  state: LightStates
}

export class Light extends Component<Props> {
  public render() {
    return (
      <div>
        <span className={`light light--${this.props.state}`} />
      </div>
    )
  }
}
```

Y tendremos por encima un `LightContainer`, este componente es un denominado _"contenedor"_. Los contenedores y componentes son un patrón de diseño que aplica a frameworks que se basan en componentes y la diferencia es que los contenedores son más listos que los componentes, ya que gestionan el estado y orquestan los componentes. Se empezó a usar a raíz de [este artículo de Dan Abramov](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0).

Este patrón nos recuerda mucho al patrón [Mediator](https://refactoring.guru/design-patterns/mediator) del GoF, donde un objeto es el encargado de gestionar las dependencias entre muchos objetos. En este caso el mediador será el contenedor y los componentes serán las dependencias. La forma de comunicación será basada en props y callbacks.

El contenido del contenedor es el siguiente:

```tsx
import React, { Component } from 'react'
import { StateManager } from './state/StateManager'
import { Observer } from './state/Observer'
import { Light, LightStates } from './Light'
import { Consumer } from './rootContainer'

interface Props {
  stateManager: StateManager
}

export class LightContainer extends Component<Props> {
  public getState(): LightStates {
    if (this.props.stateManager.state.isLoading) {
      return 'loading'
    }

    if (this.props.stateManager.state.hasError) {
      return 'error'
    }

    if (this.props.stateManager.state.hasSuccess) {
      return 'success'
    }

    return 'none'
  }

  public render(): React.ReactNode {
    return (
      <Consumer>
        {context => (
          <div className="light-controller">
            <Light state={this.getState()} />
            <button
              disabled={this.props.stateManager.state.isLoading}
              className={`button ${this.props.stateManager.state.isLoading ? 'button--disabled' : ''}`}
              onClick={async () => {
                // Si quisiésemos ir más allá delegaríamos esta funcionalidad en un servicio o en un use case, de momento nos vale aquí
                this.props.stateManager.state.users = []
                this.props.stateManager.state.users = await context.fakeUserRepository.findAll()
              }}
            >
              Get users
            </button>
            <h3>Users</h3>
            {this.props.stateManager.state.users.map(user => (
              <p key={user.name}>{user.name}</p>
            ))}
          </div>
        )}
      </Consumer>
    )
  }
}
```

Aquí vemos varias partes interesantes, estamos usando el API de [Context]() de React para consumir un objeto `context` y parece que este nos provee de un `fakeRepository` que veremos más adelante. Vemos que estamos renderizando el componente `Light` y le pasamos directamente un state con `getState()` y este a su vez accede por props a un tal `stataManager`.

Vamos primero con el contexto:

### Context

El API de context nos va a hacer las veces de inyección de dependencias para poder cumplir uno de los principios SOLID, el de la D que es dependency inversion, que dictamina que no deberíamos depender en concreciones si no en abstracciones. ¿Cómo logramos esto? Pues resulta que `fakeUserRepository` es una interfaz y tiene la siguiente pinta:

```ts
import { Repository } from './Repository'
import { FakeUser } from './FakeUser'

export interface FakeUserRepository extends Repository<FakeUser> {}
```

Y `Repository` es otra interfaz del siguiente tipo:

```ts
export interface Repository<T> {
  findAll: () => Promise<T[]>
}
```

En esta interfaz podríamos definir métodos de acceso de entidades, por ejemplo: `findOne`, `delete` o `update`. Y luego cada interfaz de tipo repositorio ya definiría métodos más concretos como: `findUserByName`.

Y por tanto nos queda ver la implementación de esta interfaz:

```ts
import { FakeUserRepository } from './FakeUserRepository'
import { RequestHandler } from '../requestHandlers/RequestHandler'
import { Request } from '../Request'
import { wait } from '../utils/wait'
import { FakeUser } from './FakeUser'

export class FakeUserHttpRepository implements FakeUserRepository {
  constructor(private readonly requestHandler: RequestHandler<FakeUser[]>) {}

  public async findAll(): Promise<FakeUser[]> {
    const promise = this.getFakeUsers()

    // Y... ¡Bam! Aquí tenemos el famoso requestHandler ya en uso ;)
    const response = await this.requestHandler.trigger(promise)

    if (response instanceof Request.Fail) {
      throw new Error('users could not be found.')
    }

    return response.value
  }

  private async getFakeUsers(): Promise<FakeUser[]> {
    await wait(1)
    const hasError = Math.random() >= 0.5

    if (hasError) {
      throw new Error()
    }

    return [{ name: 'César' }, { name: 'Paco' }, { name: 'Alejandro' }]
  }
}
```

Si vemos que la lógica de muchos repositorios es idéntica, podríamos crearnos un `GenericHttpRepository` que nos diese esa funcionalidad común.

Y aquí ya empezamos a ver todo hilado, este `FakeUserHttpRepository` ya usa por debajo nuestro famoso `RequestHandler`, siendo este el que gestiona el ciclo de vida de la petición.

Ahora nos queda meter esto en el contexto de React, ahí entra el `rootContainer`:

```ts
import { createContext } from 'react'
import { RequestHandler } from '../requestHandlers/RequestHandler'
import { StateManager } from './state/StateManager'
import { FakeUserRepository } from '../fakeUser/FakeUserRepository'
import { FakeUserHttpRepository } from '../fakeUser/FakeUserHttpRepository'
import { FakeUser } from '../fakeUser/FakeUser'

export interface AppContext {
  fakeUserRepository: FakeUserRepository
}

const fakeUserRequestHandler = new RequestHandler<FakeUser[]>(StateManager.instance)

export const contextValue: AppContext = {
  fakeUserRepository: new FakeUserHttpRepository(fakeUserRequestHandler)
}

const Context = createContext<AppContext>(contextValue)

export const Provider = Context.Provider
export const Consumer = Context.Consumer
```

Pasamos de una abstracción a una concreción, y esto es muy potente, porque imaginemos que queremos implementar un sistema de caché en local storage, lo único que tendríamos que crear es un repositorio `FakeUserLocalStorageRepository` y dinámicamente cambiar la implementación entre el `FakeUserHttpRepository` y el anterior, siendo completamente transparente para el consumidor.

El consumidor al final le da igual de dónde vengan los datos, él quiere los usuarios, ya será en otro sitio de dónde tiene que sacarlos. Además, si el día de mañana quisiésemos migrar a [GraphQL](https://graphql.org/) lo único que tendríamos que hacer sería añadir otro repositorio, cumpliendo así otro de los principios de SOLID, el de la O, que es Open/Closed, lo que quiere decir que si añadimos funcionalidad no tenemos que tocar código antiguo si no añadir más código.

Y nos queda el punto inicial de la aplicación, el `App.tsx`:

```tsx
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { contextValue, Provider } from './rootContainer'
import { LightContainer } from './LightContainer'
import { StateManager } from './state/StateManager'

export class Application extends Component {
  public render(): React.ReactNode {
    return (
      <Provider value={contextValue}>
        <main className="application">
          <LightContainer stateManager={StateManager.instance} />
        </main>
      </Provider>
    )
  }
}

const root = document.getElementById('root')
ReactDOM.render(<Application />, root)
```

Aquí proveemos del contexto y la pasamos al stateManager el estado, que, como es un singleton pues será el mismo estado siempre.

### Observadores

En un capítulo anterior hemos desarrollado un `StateManager` que era un sujeto, pero en ningún momento hemos definido quiénes se iban a suscribir a esa parte del estado. ¿Quiénes van a ser los suscriptores? Pues los componentes de React, para ello a nuestro componente `LightContainer` le diremos que implementa la interfaz `Observer`, que cuando se monte tiene que registrarse y que implementa un método `notify` que llama el `forceUpdate` de React.

```tsx
import React, { Component } from 'react'
import { StateManager } from './state/StateManager'
import { Observer } from './state/Observer'
import { Light, LightStates } from './Light'
import { Consumer } from './rootContainer'

interface Props {
  stateManager: StateManager
}

export class LightContainer extends Component<Props> implements Observer {
  public componentDidMount(): void {
    this.props.stateManager.register(this)
  }

  public notify() {
    this.forceUpdate()
  }
}
```

Quedando al completo así:

```tsx
import React, { Component } from 'react'
import { StateManager } from './state/StateManager'
import { Observer } from './state/Observer'
import { Light, LightStates } from './Light'
import { Consumer } from './rootContainer'

interface Props {
  stateManager: StateManager
}

export class LightContainer extends Component<Props> implements Observer {
  public componentDidMount(): void {
    this.props.stateManager.register(this)
  }

  public getState(): LightStates {
    if (this.props.stateManager.state.isLoading) {
      return 'loading'
    }

    if (this.props.stateManager.state.hasError) {
      return 'error'
    }

    if (this.props.stateManager.state.hasSuccess) {
      return 'success'
    }

    return 'none'
  }

  public render(): React.ReactNode {
    return (
      <Consumer>
        {context => (
          <div className="light-controller">
            <Light state={this.getState()} />
            <button
              disabled={this.props.stateManager.state.isLoading}
              className={`button ${this.props.stateManager.state.isLoading ? 'button--disabled' : ''}`}
              onClick={async () => {
                this.props.stateManager.state.users = []
                this.props.stateManager.state.users = await context.fakeUserRepository.findAll()
              }}
            >
              Get users
            </button>
            <h3>Users</h3>
            {this.props.stateManager.state.users.map(user => (
              <p key={user.name}>{user.name}</p>
            ))}
          </div>
        )}
      </Consumer>
    )
  }

  public notify() {
    this.forceUpdate()
  }
}
```

El `forceUpdate` no hace que se renderice de nuevas todo el árbol, React sigue aplicando el diffing para renderizar solamente aquello que ha cambiado.

## Nueva feature

Ahora veremos cuánto cuesta añadir nueva funcionalidad como nos pedía el usuario:

Primero añadimos unos nuevos estados en `State`

```ts
import { FakeUser } from '../../fakeUser/FakeUser'

export interface State {
  isLoading: boolean
  hasError: boolean
  hasSuccess: boolean
  hasWarning: boolean
  userHasAcknowledgedWarning: boolean
  users: FakeUser[]
}
```

Dentro del `StateManager` le damos un valor vacío y le decimos que cuando hay un estado vacío debe poner el `hasWarning` a `false`.

```ts
export class StateManager implements Subject {
  public getEmptyState(): State {
    return {
      isLoading: false,
      hasError: false,
      hasSuccess: false,
      hasWarning: false,
      userHasAcknowledgedWarning: false,
      users: []
    }
  }

  public setEmptyState(): void {
    this.state.isLoading = false
    this.state.hasError = false
    this.state.hasSuccess = false
    this.state.hasWarning = false
    this.state.userHasAcknowledgedWarning = false
    this.state.users = []
  }
}
```

Creamos una clase `RequestWarningHandler`:

```ts
import { Handler } from './Handler'
import { RequestHandlerContext } from './RequestHandler'
import { RequestEmptyHandler } from './RequestEmptyHandler'
import { wait } from '../utils/wait'
import { RequestStartHandler } from './RequestStartHandler'

export class RequestWarningHandler<T> implements Handler<RequestHandlerContext<T>> {
  private nextHandler: Handler<RequestHandlerContext<T>> = new RequestEmptyHandler()

  public async next(context: RequestHandlerContext<T>) {
    context.stateManager.state.hasWarning = true
    await wait(2.5)
    if (context.stateManager.state.userHasAcknowledgedWarning) {
      this.setNext(new RequestStartHandler())
    }

    await this.nextHandler.next(context)
    context.stateManager.state.hasWarning = false
  }

  public setNext(handler: Handler<RequestHandlerContext<T>>) {
    this.nextHandler = handler
  }
}
```

Si el usuario no acepta el warning en un marco de 2 segundos y medio no comenzará la petición, ya que se irá añ `RequestEmptyHandler`. Y modificamos el método `trigger` de la clase `RequestHandler`:

```ts
import { Handler } from './Handler'
import { RequestStartHandler } from './RequestStartHandler'
import { RequestEmptyHandler } from './RequestEmptyHandler'
import { StateManager } from '../application/state/StateManager'
import { RequestResponseHandler } from './RequestResponseHandler'
import { Request } from '../Request'
import { RequestWarningHandler } from './RequestWarningHandler'

export type RequestHandlerContext<T> = {
  stateManager: StateManager
  request: Promise<T>
  response: Request.Payload<T>
}

export class RequestHandler<T> {
  ...

  public async trigger(request: Promise<T>, hasWarning: boolean = false): Promise<Request.Success<T> | Request.Fail> {
    const response: Request.Payload<T> = {
      hasError: false,
      value: null
    }

    if (hasWarning) {
      this.requestStartHandler.setNext(new RequestWarningHandler())
    }

    await this.requestStartHandler.next({ stateManager: this.state, request, response })

    if (response.hasError) {
      return new Request.Fail()
    }
    return new Request.Success(response.value as T)
  }
}
```

## Conclusión

Hemos visto un montón de patrones (Singleton, Observador, Chain of responsability, Proxy, Mediator), junto con separación de capas con repositorios, estado y componentes
