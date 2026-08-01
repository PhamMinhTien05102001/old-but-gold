# data-test (local only)

Khi `.env` có `VITE_USE_TEST_DATA=true`, app đọc JSON trong folder này.

```
data-test/
  latest/
    hkn.json
    kkvh.json
  history/
    hkn/
      history.json
    kkvh/
      history.json
```

Sửa file rồi restart `npm run dev` nếu vừa đổi `.env`.
