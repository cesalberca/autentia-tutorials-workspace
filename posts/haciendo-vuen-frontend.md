# Haciendo (Vue)n frontend

[Vue](https://vuejs.org/) es un framework progresivo, versatil y que tiende a la optimización. Opta por la simplicidad en algunos aspectos y adopta cosas de [React](https://reactjs.org/) y [Angular](https://angular.io/). En este post veremos consejos para que tu código con Vue sea impoluto y fácil de testear.

## 1. Usa TypeScript

[TypeScript](https://www.typescriptlang.org/) te va a ayudar mucho a detectar errores antes de que ejecutes el programa, vas a ser más productivo ya que tu IDE te va a ofrecer más ayudas y tendrás documentación acerca de las estructuras y modelos que usas en tu aplicación.

[Vue da soporte a TypeScript](https://vuejs.org/v2/guide/typescript.html), e incluso [han anunciado con la versión 3](https://medium.com/the-vue-point/plans-for-the-next-iteration-of-vue-js-777ffea6fabf) un rewrite de Vue en TypeScript. Hasta entonces el soporte que dan en ficheros `.vue` deja un poco que desear, ya que dependes de extensiones como Vetur o que tu IDE de un buen soporte.

Por las razones antes mencionadas, y dado que han anunciado que en el nuevo API será orientada a clases y no a objetos yo recomiendo usar [vue-class-component](https://github.com/vuejs/vue-class-component) y [vue-property-decorator](https://github.com/kaorun343/vue-property-decorator). Con estas bibliotecas logramos que nuestro código sea más legible y más seguro en cuanto a tipos. Si usas [Vuex](https://vuex.vuejs.org/guide/) te recomiendo que eches un ojo a [vuex-class](https://github.com/ktsn/vuex-class).

_Nota: Estas bibliotecas están arropadas por Vue. Su creador es un [miembro core del equipo de Vue](https://github.com/ktsn) que lleva toda la parte de TypeScript dentro de Vue._

## 2. Usa Inject/Provide

[Inject / provide](https://vuejs.org/v2/api/#provide-inject) es una API de Vue para hacer las veces de un contenedor simple de IoC, donde podremos proveer de dependencias dentro de un árbol de componentes a cualquier nivel. Por ejemplo, imaginemos que nuestro componente llama a un [repositorio]():

```vue
<template>
  <section class="viewer">
    <header>
      <h1>Gravatar Viewer</h1>
      <label for="email">Email</label>
      <input name="email" type="email" v-model="email" class="email" />
    </header>

    <main v-if="showUser">
      <h3>User</h3>
      <img :src="user.photo" alt="User image" />
    </main>
  </section>
</template>
<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { GravatarRepository } from "./../domains/gravatar/repositories/GravatarRepository";
import { GravatarRepositoryFactory } from "./../domains/gravatar/repositories/GravatarRepositoryFactory";
import { User } from "./../domains/users/User";
import * as md5 from "md5";
import { debounce } from "./../utils/debounce";

@Component
export default class UserComponent extends Vue {
  email: string = "";
  user: User = User.empty();
  gravatarRepository: GravatarRepository;
  debouncedQueryEmail: () => void;

  created() {
    this.gravatarRepository = GravatarRepositoryFactory.photo();
    this.debouncedQueryEmail = debounce(this.queryEmail, 1000);
  }

  get showUser() {
    return this.user.exists();
  }

  @Watch("email")
  onEmailChange() {
    this.debouncedQueryEmail();
  }

  async queryEmail() {
    const hash = md5(this.email);
    const user = await this.gravatarRepository.getUserByEmailHash(hash);
    this.user = user;
  }
}
</script>
<style scoped>
.viewer {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.email {
  margin-left: 8px;
}
</style>
```

Aquí tendremos un problema muy grande si queremos mañana consumir un repositorio distinto. Tendremos que cambiar _todos_ los componentes donde haya una concreción como la hay cuando se llama a la factoría `GravatarRepositoryFactory.photo()`. 

Además los tests de este componente van a ser insufribles, porque tendremos que de alguna forma mockear el import, ya que no queremos que haga peticiones de verdad en el test unitario.

_Nota: La función `debounce` hace que un método no se ejecute hasta que pase un tiempo mínimo de 1000ms, lo que evita que hagamos un montón de peticiones al API que peticionamos._

Con inject podemos mejorar esta situación:

```vue
<template>
  <section class="viewer">
    <header>
      <h1>Gravatar Viewer</h1>
      <label for="email">Email</label>
      <input name="email" type="email" v-model="email" class="email" />
    </header>

    <main v-if="showUser">
      <h3>User</h3>
      <img :src="user.photo" alt="User image" />
    </main>
  </section>
</template>
<script lang="ts">
import { Component, Vue, Watch, Inject } from "vue-property-decorator";
import { GravatarRepository } from "./../domains/gravatar/repositories/GravatarRepository";
import { User } from "./../domains/users/User";
import * as md5 from "md5";
import { debounce } from "./../utils/debounce";

@Component
export default class UserComponent extends Vue {
  email: string = "";
  user: User = User.empty();

  @Inject()
  gravatarRepository: GravatarRepository;

  debouncedQueryEmail: () => void;

  created() {
    this.debouncedQueryEmail = debounce(this.queryEmail, 1000);
  }

  get showUser() {
    return this.user.exists();
  }

  @Watch("email")
  onEmailChange() {
    this.debouncedQueryEmail();
  }

  async queryEmail() {
    const hash = md5(this.email);
    const user = await this.gravatarRepository.getUserByEmailHash(hash);
    this.user = user;
  }
}
</script>
<style scoped>
.viewer {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.email {
  margin-left: 8px;
}
</style>
```

El cambio es muy sutil, pero muy efectivo. Ahora nos falta proveer de la implementación de `gravatarRepository`. Para ello nos podemos crear un componente `ProviderFactory` que sea el que se encarga de gestionar la creación de instancias y que las inyecte:

```vue
<template>
  <div><slot /></div>
</template>
<script lang="ts">
import { Component, Vue, Provide } from "vue-property-decorator";
import { GravatarRepositoryFactory } from "./../domains/gravatar/repositories/GravatarRepositoryFactory";
import { GravatarRepository } from "./../domains/gravatar/repositories/GravatarRepository";

@Component
export default class ProviderFactory extends Vue {
  @Provide()
  gravatarRepository: GravatarRepository = GravatarRepositoryFactory.photo();
}
</script>
```

Y ahora en el fichero `App.vue` haremos uso de él:

```vue
<template>
  <ProviderFactory> <UserComponentInject /> </ProviderFactory>
</template>
<script lang="ts">
import { Vue, Component } from "vue-property-decorator";
import * as UserComponentInject from "./components/UserComponentInject";
import * as ProviderFactory from "./components/ProviderFactory.vue";

@Component({
  components: {
    UserComponentInject,
    ProviderFactory
  }
})
export default class App extends Vue {}
</script>
```

Si mañana tenemos un nuevo repositorio basado en local storage, solamente tendríamos que cambiarlo en el `ProviderFactory`. Incluso podríamos jugar a cambiar la implementación en caliente basándonos en cierta lógica.

El test además sería mucho más fácil, ya que podríamos decir que para el test se haga un provide de un mock.

¿Identificas además otra dependencia en el componente? Sí, el `md5` y el `debounce` es una concreción, si queremos seguir la D de SOLID no deberíamos depender de concreciones si no de abstracciones.

## 3. Usa componentes y contenedores

Los componentes y contenedores no son más que el patrón de diseño [Mediator](https://en.wikipedia.org/wiki/Mediator_pattern). Donde los componentes serán los que se encargar de pintar, podrán tener lógica de pintado, pero muy poca. Reciben datos y los pintas, nada más. Los contenedores son aquellos que orquestan a los componentes y les pasan los datos. Suelen tener más lógica pero no suelen tener ni estilos visuales ni markup.

Los componentes se comunican con los contenedores mediante eventos, y los contenedores se comunican con los componentes mediante props. Esto hace que los tests sean mucho más fáciles, los componentes estén super desacoplados y si falla algo en cuanto a la orquestación, sabremos que tenemos que mirar el contenedor.

Como ejemplo vamos a refactorizar nuestro componente `UserComponenteInject`. Creamos primero el componente `AvatarComponent`

```vue
<template>
  <div v-if="showUser">
    <h3>User</h3>
    <img :src="user.photo" alt="User image" />
  </div>
</template>
<script lang="ts">
import { Prop, Component, Vue } from "vue-property-decorator";
import { User } from "./../domains/users/User";

@Component
export default class AvatarComponent extends Vue {
  @Prop({ type: Object, default: () => User.empty() })
  user!: User;

  get showUser() {
    return this.user.exists();
  }
}
</script>
```

Ahora podemos crear el componente que se encarga del input del email. Creamos el componente `UserForm`:

```vue
<template>
  <header>
    <h1>Gravatar Viewer</h1>
    <label for="email">Email</label>
    <input name="email" type="email" @input="onEmailChange" class="email" />
  </header>
</template>
<script lang="ts">
import { Component, Vue, Emit } from "vue-property-decorator";

@Component
export default class UserFormComponent extends Vue {
  @Emit()
  onEmailChange(event: InputEvent) {
    return event.target.value;
  }
}
</script>
<style scoped>
.email {
  margin-left: 8px;
}
</style>
```

Y por último creamos `AvatarViewerContainer`: 

```vue
<template>
  <section class="viewer">
    <UserFormComponent @on-email-change="updateEmail" />
    <AvatarComponent :user="user" />
  </section>
</template>
<script lang="ts">
import { Component, Vue, Watch, Inject } from "vue-property-decorator";
import { GravatarRepository } from "./../domains/gravatar/repositories/GravatarRepository";
import * as UserFormComponent from "./UserFormComponent.vue";
import * as AvatarComponent from "./AvatarComponent.vue";
import { User } from "./../domains/users/User";
import { hasher } from "./../utils/hasher";

@Component({
  components: {
    AvatarComponent,
    UserFormComponent
  }
})
export default class AvatarViewerContainer extends Vue {
  email: string = "";
  user: User = User.empty();

  @Inject()
  gravatarRepository: GravatarRepository;

  @Inject()
  debounce: typeof debounce;
  
  
  @Inject()
  hasher: typeof hasher;

  debouncedQueryEmail: () => void;

  created() {
    this.debouncedQueryEmail = this.debounce(this.queryEmail, 1000);
  }

  @Watch("email")
  onEmailChange() {
    this.debouncedQueryEmail();
  }

  updateEmail(email: string) {
    this.email = email;
  }

  async queryEmail() {
    const hash = md5(this.email);
    const user = await this.gravatarRepository.getUserByEmailHash(hash);
    this.user = user;
  }
}
</script>
<style scoped>
.viewer {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
```

También modificamos el ProviderFactory para inyectar el `debounce` y el `hasher`:

```vue
<template>
  <div><slot /></div>
</template>
<script lang="ts">
import { Component, Vue, Provide } from "vue-property-decorator";
import { GravatarRepositoryFactory } from "./../domains/gravatar/repositories/GravatarRepositoryFactory";
import { GravatarRepository } from "./../domains/gravatar/repositories/GravatarRepository";
import { debounce } from "./../utils/debounce";
import { hasher } from "./../utils/hasher";

@Component
export default class ProviderFactory extends Vue {
  @Provide()
  gravatarRepository: GravatarRepository = GravatarRepositoryFactory.photo();

  @Provide()
  debounce: typeof debounce = debounce;
  
  @Provide()
  hasher: typeof hasher = hasher;
}
</script>
```

## 4. Haz testing

Como puedes ver en proyecto de ejemplo, todos los componentes y piezas están testadas. Al seguir SOLID y buenas prácticas el añadir test unitarios de todo es trivial.

Por ejemplo veamos el `AvatarViewerContainer.spec.ts`:

```typescript
import { Vue } from "vue";
import * as AvatarViewerContainer from "./../AvatarViewerContainer.vue";
import { Wrapper, shallowMount } from "@vue/test-utils";
import { User } from "./../../domains/users/User";
import { GravatarRepository } from "./../../domains/gravatar/GravatarRepository";
import { flushPromises } from "./../../utils/flushPromises";
import { hasher } from "./../../utils/hasher";
import { debounce } from "./../../utils/debounce";

describe("AvatarViewerContainer", () => {
  let wrapper: Wrapper<Vue>;
  let gravatarRepositoryMock: jest.Mock<GravatarRepository>;
  let debounceMock: jest.Mock<typeof debounce>;
  let hasherMock: jest.Mock<typeof hasher>;

  beforeEach(() => {
    hasherMock = jest.fn();
    debounceMock = jest.fn((fn: Function) => fn());
    gravatarRepositoryMock = {
      getUserByEmailHash: jest
        .fn()
        .mockReturnValue(Promise.resolve(new User("foo")))
    };

    wrapper = shallowMount(AvatarViewerContainer, {
      provide: {
        gravatarRepository: gravatarRepositoryMock,
        debounce: debounceMock,
        hasher: hasherMock
      }
    });
  });

  it("should call gravatarRepository when email changes", async () => {
    const userFormComponent = wrapper.find({ name: "UserFormComponent" });

    userFormComponent.vm.$emit("on-email-change", "foo@foo.com");
    await flushPromises();

    expect(gravatarRepositoryMock.getUserByEmailHash).toHaveBeenCalled();
  });

  it("should debounce call when email changes", async () => {
    const userFormComponent = wrapper.find({ name: "UserFormComponent" });

    userFormComponent.vm.$emit("on-email-change", "foo@foo.com");
    await flushPromises();

    expect(debounceMock).toHaveBeenCalled();
  });

  it("should set user to AvatarComponent", async () => {
    const userFormComponent = wrapper.find({ name: "UserFormComponent" });
    const avatarComponent = wrapper.find({ name: "AvatarComponent" });

    userFormComponent.vm.$emit("on-email-change", "foo@foo.com");
    await flushPromises();

    expect(avatarComponent.props("user").photo).toBe("foo");
  });

  it("should use the hasher", async done => {
    expect.assertions(1);

    const userFormComponent = wrapper.find({ name: "UserFormComponent" });

    userFormComponent.vm.$emit("on-email-change", "foo@foo.com");
    await flushPromises();

    wrapper.vm.$nextTick(() => {
      expect(hasherMock).toHaveBeenCalledWith("foo@foo.com");
      done();
    });
  });
});
```

O los componentes `AvatarComponent.spec.ts`:


```typescript
import { Vue } from "vue";
import * as AvatarComponent from "./../AvatarComponent.vue";
import { Wrapper, shallowMount } from "@vue/test-utils";
import { User } from "./../../domains/users/User";

describe("AvatarComponent", () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(() => {
    wrapper = shallowMount(AvatarComponent);
  });

  it("should hide if the user doesn't exist", () => {
    wrapper.setProps({ user: User.empty() });

    expect(wrapper.html()).toBeUndefined();
  });

  it("should show if the user exists", () => {
    wrapper.setProps({ user: new User("foo") });

    expect(wrapper.html()).toBeDefined();
  });

  it("should set the image url with the user's photo", () => {
    wrapper.setProps({ user: new User("foo") });

    const image = wrapper.find("img");
    expect(image.attributes("src")).toEqual("foo");
  });
});
```

Y el `UserFormComponent`:

```typescript
import { Vue } from "vue";
import * as UserFormComponent from "./../UserFormComponent.vue";
import { Wrapper, shallowMount } from "@vue/test-utils";
import { User } from "./../../domains/users/User";

describe("UserFormComponent", () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(() => {
    wrapper = shallowMount(UserFormComponent);
  });

  it("should emit event", () => {
    const input = wrapper.find("input");
    input.element.value = "foo";
    input.trigger("input");
    expect(wrapper.emitted("on-email-change")[0][0]).toEqual("foo");
  });
});
```

No hacer testing __nunca__ está justificado.

# 5. Mueve lógica de negocio fuera de los componentes

Como hemos visto antes en el contenedor `AvatarViewerContainer` había un `GravatarRepository`. Básicamente este repositorio luego por debajo se conecta con un API y te devuelve la imagen del usuario. Podríamos hacer la llamada en el contenedor directamente, pero estaríamos acoplando nuestra obtención de datos con un framework (Vue) y romperíamos SOLID, ya que el motivo de cambio del contenedor es que la interacción cambie o que el API cambie.

Veamos más detenidamente `GravatarRepository`:

```typescript
import { User } from "./../../users/User";

export interface GravatarRepository {
  getUserByEmailHash(hash: string): Promise<User>;
}
```

Pues resulta que es una interfaz. ¿Por qué? Porque esto nos permite definir varios repositorios para acceder a los datos. Podríamos tener una implementación de esta interfaz en `GravatarHttpRepository`, `GravatarLocalStorageRepository` o `GravatarBlobRepository` como es nuestro caso. Además podríamos cambiar la implementación tanto en "compilación" como en caliente.

Aquí está `GravatarBlobRepository`:

```typescript
import { GravatarRepository } from "./GravatarRepository";
import { GravatarResponse } from "./GravatarResponse";
import { Fetcher } from "./../Fetcher";
import { User } from "./../../users/User";

export class GravatarBlobRepository implements GravatarRepository {
  private url: string;

  constructor(private readonly fetcher: Fetcher) {
    this.url = "https://seccdn.libravatar.org/avatar";
  }

  async getUserByEmailHash(hash: string): Promise<User> {
    const response = await this.fetcher(`${this.url}/${hash}`);
    const result = await response.blob();
    const object = URL.createObjectURL(result);
    return new User(object);
  }
}
``` 

Por constructor le hemos pasado un `fetcher`, este es el encargado de recoger los datos de una API y tiene el siguiente tipo:


```typescript
export type Fetcher = <Response>(
  query: string,
  options?: {
    mode: string;
  }
) => Promise<{ json: () => Promise<Response> }>;
```

A aquellos que les suene verá que es igualito que el API de [fetch](), que es el que usaremos luego en verdad.

El `GravatarResponse` es un tipo:

```typescript
export type GravatarResponse = Blob;
```

Y por último, ¿dónde creamos la instancia de `GravatarBlobRepository`? Pues con una factoría. 

`GravataRepositoryFactory`:

```typescript
import { GravatarRepository } from "./GravatarRepository";
import { GravatarBlobRepository } from "./GravatarBlobRepository";

export class GravatarRepositoryFactory {
  static photo(): GravatarRepository {
    const fetcher = window.fetch.bind(window);
    return new GravatarBlobRepository(fetcher);
  }
}
```

Aquí vemos que hemos pasado de una abstracción `Fetcher` a una concreción: `window.fetch`, siendo en un futuro configurable e intercambiable por otra solución.

Por último hemos modelado nuestro usuario con una clase. Aquí tenemos el modelo del `User`:


````typescript
export class User {
  constructor(private readonly photo: string) {}

  static empty() {
    return new User("");
  }

  exists(): boolean {
    return this.photo.length !== 0;
  }
}
````

Es importante evitar que nuestros modelos sean interfaces sin comportamiento o clases con setters o propiedades públicas, ya que nos pueden llevar a [modelos anémicos](), es decir modelos que son una bolsa de propiedades, siendo imposible determinar cual es su estado válido, delegando en el consumidor la lógica de validez, lo que haría a su vez que duplicásemos esa lógica.

## Conclusión

El front no es fácil. Venimos de un mundo dónde a lo más que podíamos aspirar es a maquetar, aplicar estilos y usar algo de JavaScript para lograr animaciones e interactividad con la página. Todo esto ha cambiado, ahora debemos gestionar un montón de estado, asincronía, optimización de peticiones y caché, diseño responsive, reactividad y un montón más de cosas.

¿Por qué nos privamos de usar las herramientas y mecanismos que se llevan usando en la programación orientada a objetos desde hace más de 20 años?

Sígueme en [Twitter](https://twitter.com/) y en [Github](https://github.com/cesalberca).
