# data-test (local only)

Khi `.env` có `VITE_USE_TEST_DATA=true`, app đọc JSON trong folder này.

```
data-test/
  history/
    hkn/
      history.json
    kkvh/
      history.json
    hn/
      history.json
  schedule.json
```

Giá hiện tại = điểm cuối mỗi `history.json`. Không còn thư mục `latest/`.

Sửa file rồi restart `npm run dev` nếu vừa đổi `.env`.
