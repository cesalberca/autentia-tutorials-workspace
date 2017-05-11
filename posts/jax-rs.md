<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Índice**

- [JAX-RS](#jax-rs)
  - [Arquitectura API REST](#arquitectura-api-rest)
    - [GET](#get)
    - [POST](#post)
    - [DELETE](#delete)
    - [PUT y PATCH](#put-y-patch)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# JAX-RS

JAX-RS (Java API for RESTful Web Services) es una especificación de Java que da soporte a la creación de servicios web basados en la arquitectura [Representational State Transfer](https://es.wikipedia.org/wiki/Transferencia_de_Estado_Representacional) (REST). Hace uso de anotaciones y tiene varias implementaciones, como: Jersey, Apache CXF, RESTeasy, RESTlet, étc. Liferay usa la implementación de Apache CXF, aunque al ser una especificación al aprender una aprendemos todas. Actualmente JAX RS va por la versión 2.0 que fue sacada en 2013.

## Arquitectura API REST

Según la arquitectura REST el enfoque cae en los recursos, que son sustantivos en plural (Usuarios, Roles, Artículos, étc...) y sobre estos recursos, dependiendo del método http que usemos se tomarán unas acciones u otras. En el protocolo http tenemos 4 verbos _principales_: GET, POST, PUT y DELETE. Con estos verbos podemos hacer operaciones __CRUD__ sobre un recurso.

En la siguiente sección del tutorial veremos un poco de teoría de la arquitectura REST, luego veremos sobre código cómo se implementaría y por último haríamos las peticiones con una extensión de Chrome llamada [Postman](https://www.getpostman.com/), aunque también dispone de una aplicación de escritorio.

### GET

Cuando te conectas a un endpoint de un recurso, éste debería devolver un listado de todas las entidades de ese recurso.

```
GET localhost:8080/o/rest-api/usuarios
```

Para devolver un único usuario se atacaría al endpoint y se pasaría por una variable del path el id del usuario:

```
GET localhost:8080/o/rest-api/usuarios/1
```

### POST

Si queremos añadir un usuario debemos utilizar el método POST en el endpoint del recurso, por ejemplo:

```
POST localhost:8080/o/rest-api/usuarios/
{
  "nombre": "César",
  "apellido": "Alberca",
  "ocupacion": "Programador"
}
```
Y pasarle en el body el recurso que queremos insertar. Es importante especificar en la petición el tipo 'Content-Type' que usemos.

### DELETE

Para eliminar un recurso debemos hacer una petición DELETE a la url del recurso con su id. Por ejemplo, si queremos eliminar el usuario 3 sería de la siguiente formar:

`DELETE localhost:8080/o/rest-api/usuarios/3`

### PUT y PATCH

Los verbos PUT y PATCH se utilizan para actualizar un recurso. Como os podéis imaginar debemos pasar el nombre del recurso y el id. Y el recurso actualizado en el body de la petición. Lo que nos dejaría lo siguiente:

```
PUT localhost:8080/o/rest-api/usuarios/3
{
  "nombre": "César",
  "apellido": "Alberca",
  "ocupacion": "Diseñador"
}
```

Lo diferencia entre el PUT y el PATCH es que el PUT requiere que vuelvas a pasar todos los campos de nuevo mientras que el PATCH solo necesitas pasar el campo que quieres cambiar.

En el ejemplo anterior si quisiésemos cambiar la ocupación de "Programador" a "Diseñador" con el PATCH sería de la siguiente forma:

```
PATCH localhost:8080/o/rest-api/usuarios/3
{ "ocupacion": "Diseñador" }
```
