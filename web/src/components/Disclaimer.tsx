export function Disclaimer() {
  return (
    <p className="max-w-prose text-sm leading-relaxed text-muted">
      Market values and stats come from Transfermarkt, via the Kaggle dataset{" "}
      <a
        className="underline underline-offset-2"
        href="https://www.kaggle.com/datasets/davidcariboo/player-scores"
      >
        davidcariboo/player-scores
      </a>
      . Five-year values are estimates from a statistical model, shown as a range. They are not
      predictions you should rely on, and real values can land well outside the range.
    </p>
  );
}
