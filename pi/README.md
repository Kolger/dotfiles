# Pewget Pi

A shareable Pi setup with a custom footer, session recap, editor stash, todo list, and two themes. In fullscreen, Todo and Recap hide when you scroll away from the end and reappear when you return.

## Extensions and themes only

```bash
pi install git:github.com/OWNER/dotfiles
```

Replace `OWNER` with the repository owner's GitHub username. Pi installs the package and its dependencies and adds it to your `packages` list. This does not install the third-party extensions in `preset.json` or change the active theme. Choose `pewget-dark` in `/settings` if you want to use it. Update Git-installed packages with `pi update --extensions`.

## Full profile

Requires Bash, npm, Pi (tested with **1.6.0**), and a Node.js version supported by Cursor SDK (`>=24.22.3 <25` or `>=26.13.1`). Close Pi, clone this repository, and run these commands from its root:

```bash
./pi/install.sh
pi
```

The installer loads the same Pi package from the clone and installs the pinned third-party extensions in `preset.json`. It backs up your existing configuration, applies the appearance preset (including `pewget-dark`) to your local `settings.json`, and symlinks `pi-cc-extensions.json`. Other settings are preserved. Changes made through `/ccstyle` will be written to the checkout.

To try the setup without changing your existing Pi profile:

```bash
export PI_CODING_AGENT_DIR="$HOME/.pi/pewget-preview"
./pi/install.sh
pi
```

Set `OPENCODE_API_KEY` to your own OpenCode Go key to use `/recap`. The extension sends the text of the active session branch to OpenCode Go after every three completed exchanges or when you run `/recap`. Configure your main model provider separately. Herdr is not bundled; install its integration through Herdr.

Credentials, models, sessions, and machine-specific settings are not copied. Use one installation method at a time. If you already have the Git package or standalone copies of the `pewget-*` extensions, remove the duplicate installations or use a separate profile.

For the full profile, run `git pull` in the clone and then `/reload` in Pi. If dependencies or `preset.json` changed, close Pi and rerun `./pi/install.sh` first. Keep the clone in place: Pi loads the extensions and the linked config from it. To remove the local package, run `pi remove "$PWD"` from the clone root. This leaves the third-party extensions and the config symlink in place.
