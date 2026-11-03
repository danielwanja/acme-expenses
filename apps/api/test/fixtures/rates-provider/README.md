Recorded from the rates provider's sandbox with the recording script, which a
human runs with the sandbox key in their own shell. Never hand-edit or invent
a fixture. (In this companion repo the provider is fictional, so these files
are examples in the provider's documented shape.)

- eur-weekday.json: GET /rates/2026-10-30?base=EUR (a Friday)
- eur-weekend.json: GET /rates/2026-10-31?base=EUR (a Saturday: the provider
  returns Friday's rates and says so in `date`)
- jpy-weekday.json: GET /rates/2026-10-30?base=JPY
