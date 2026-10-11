# Lesson content

One YAML file per unit, in course order (`01-…`, `02-…`). Everything here is reviewed by a
human in a PR before kids see it; nothing is generated live.

```yaml
id: animals            # stable: progress is stored against unit/lesson/word ids
title: Animals
emoji: 🐾
words:                 # id: {es, en, emoji}
  perro: { es: el perro, en: the dog, emoji: 🐶 }
lessons:               # each lesson teaches 4–6 of the unit's words
  - id: animals-1
    title: Pets
    words: [perro, gato, pajaro, pez]
```

Rules (checked when the app starts and in `tests/test_content.py`):

- Ids are lowercase ASCII (`a-z`, `0-9`, `_`, `-`) and unique across the whole course. **Never
  rename or reuse an id** once it has shipped; kids' progress points at it.
- Every word is in at least one lesson, and every lesson word exists in its unit.
- Within a lesson, emojis are all different, so a picture never has two right answers.
- Nouns include their article (`el perro` → `the dog`), so kids learn the gender with the word.
- Spanish is neutral Latin American; spell accents properly (`adiós`, `sí`, `ratón`).

To print everything as a table (handy for reviewing a PR):

```sh
uv run python -m app.cli content-table
```
