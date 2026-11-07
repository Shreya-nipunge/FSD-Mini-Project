import { newsService } from "../services/newsService.js";

export async function getNews(req, res) {
  const result = await newsService.getNews(req.query.q ?? "crime India");
  res.status(result.httpStatus).json(result.body);
}
