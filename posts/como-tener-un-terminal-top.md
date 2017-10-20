# Cómo tener una terminal 🔝

Una imagen vale más que mil palabras, con lo cual, unos cuantos GIF valdrán muchas más:

![Autocompletado de directorios](./../imgs/terminal/zsh.gif)

Autocompletado de git:

![Autocompletado de git](./../imgs/terminal/git.gif)

Podremos navegar fácilmente por los últimos directorios usados:

![Z](./../imgs/terminal/z.gif)

Tenemos un fuzzy finder para encontrar todo lo que queramos:

![FZF](./../imgs/terminal/fzf.gif)

¿Tú también lo quieres? Sigue este tutorial para tener el mejor terminal de todos.

## Software

* iTerm 2 3.1.3
* Homebrew 1.3.6
* VSCode 1.17.2

## Instalación de ZSH

Todo es mucho más fácil con [Homebrew](https://brew.sh/). Si estás en Windows te recomiendo [Choco](https://chocolatey.org/) y si estás en Linux tenemos [Linuxbrew](linuxbrew.sh).

El resto del tutorial usaremos Homebrew, los pasos serán muy parecidos con Linuxbrew.

Ahora bien, para comenzar instalaremos [zsh](http://www.zsh.org/) con Homebrew. Así que abrimos terminal e introducimos el siguiente comando:

```bash
brew install zsh
```

Además instalaremos las [zsh-completions](https://github.com/zsh-users/zsh-completions), ya que son necesarias para `oh my zsh`:

```bash
brew install zsh-completions
```

Lo siguiente será tener [git](https://git-scm.com/) instalado, para más tarde poder instalar `oh my zsh`:

```bash
brew install git
```

Bien, ahora instalaremos [oh my zsh](https://github.com/robbyrussell/oh-my-zsh). Oh my zsh gestiona de forma automática la configuración de zsh, además cuenta con un montón de [plugins](https://github.com/robbyrussell/oh-my-zsh/tree/master/plugins), [temas](https://github.com/robbyrussell/oh-my-zsh/wiki/External-themes) y [utilidades](https://github.com/robbyrussell/oh-my-zsh/tree/master/tools).

Para instalarlo ejecutaremos desde terminal el siguiente comando:

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
```

Ahora reiniciamos el terminal y veremos que nos ha configurado ya zsh:

![]()

## Cambiar el tema

Vamos a ir más allá y vamos a instalar un tema como el que mostraba al principio:

## Conclusiones

Antes:

![Terminal por defecto](./../imgs/terminal/terminal-por-defecto.png)

Después:

