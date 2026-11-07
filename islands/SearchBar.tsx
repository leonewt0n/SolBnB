import {
  query,
  searchError,
  searchStatus,
  searchUsaPlace,
  localFilterOnly,
} from "./store.ts";

export default function SearchBar() {
  const busy = searchStatus.value === "searching";

  async function runSearch(e?: Event) {
    e?.preventDefault();
    const form = e?.currentTarget as HTMLFormElement | undefined;
    const input = form?.querySelector("input[type='search']") as
      | HTMLInputElement
      | undefined;
    const q = input?.value ?? query.value;
    query.value = q;
    await searchUsaPlace(q);
  }

  return (
    <form class="search" onSubmit={runSearch}>
      <label class="search__field">
        <span class="search__label">Search USA</span>
        <input
          class="search__input"
          type="search"
          placeholder="City, neighborhood, or ZIP anywhere in the USA"
          value={query.value}
          disabled={busy}
          onInput={(e) => {
            query.value = (e.target as HTMLInputElement).value;
            // Typing filters pins in the current map area.
            localFilterOnly.value = true;
            searchError.value = null;
          }}
        />
      </label>
      <button class="search__btn" type="submit" disabled={busy}>
        {busy ? "Searching…" : "Search"}
      </button>
      {searchError.value && (
        <p class="search__error" role="status">{searchError.value}</p>
      )}
    </form>
  );
}
