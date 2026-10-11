"""Server-side and dev commands, e.g.:

uv run python -m app.cli content-table
"""

import argparse

from app.content import get_course


def content_table() -> None:
    """Prints the whole course as a Markdown table, for reviewing content in a PR."""
    print("| Unit | Lesson | Spanish | English | Emoji |")
    print("|---|---|---|---|---|")
    for unit in get_course().units:
        for lesson in unit.lessons:
            for word in lesson.words:
                print(
                    f"| {unit.emoji} {unit.title} | {lesson.title} "
                    f"| {word.es} | {word.en} | {word.emoji} |"
                )


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("content-table", help="Print all lesson content as a Markdown table")
    args = parser.parse_args()
    if args.command == "content-table":
        content_table()


if __name__ == "__main__":
    main()
