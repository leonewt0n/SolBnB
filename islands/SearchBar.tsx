import { query } from "./store.ts";

export default function SearchBar() {
  return (
    <label class="search">
      <span class="search__label">Search</span>
      <input
        class="search__input"
        type="search"
        placeholder="Neighborhood or area code (e.g. Mission, 94110)"
        value={query.value}
        onInput={(e) => {
          query.value = (e.target as HTMLInputElement).value;
        }}
      />
    </label>
  );
}
