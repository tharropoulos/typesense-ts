import { constructUrl } from "@/lib/url";
import { describe, expect, it } from "vitest";

describe("constructUrl", () => {
  const baseUrl = "https://api.example.com/collections";

  it("should return baseUrl when no params provided", () => {
    const url = constructUrl({ baseUrl });
    expect(url).toBe(baseUrl);
  });

  it("should return baseUrl when params is empty object", () => {
    const url = constructUrl({ baseUrl, params: new URLSearchParams({}) });
    expect(url).toBe(baseUrl);
  });

  it("should return baseUrl with the endpoint", () => {
    const url = constructUrl({ baseUrl, endpoint: "/schema" });
    expect(url).toBe("https://api.example.com/collections/schema");
  });

  it("should return baseUrl with the endpoint and query parameters", () => {
    const url = constructUrl({
      baseUrl,
      params: new URLSearchParams({ q: "test" }),
      endpoint: "/schema",
    });
    expect(url).toBe("https://api.example.com/collections/schema?q=test");
  });

  it("should append simple query parameters", () => {
    const url = constructUrl({
      baseUrl,
      params: new URLSearchParams({
        q: "test",
        page: "1",
        limit: "10",
      }),
    });
    expect(url).toBe(
      "https://api.example.com/collections?q=test&page=1&limit=10",
    );
  });

  it("should handle Typesense filter and sort parameters", () => {
    const url = constructUrl({
      baseUrl,
      params: new URLSearchParams({
        filter_by: "name:[John, Doe] && age:<20",
        sort_by: "age:desc,name:desc",
      }),
    });
    expect(url).toBe(
      "https://api.example.com/collections?filter_by=name%3A%5BJohn%2C+Doe%5D+%26%26+age%3A%3C20&sort_by=age%3Adesc%2Cname%3Adesc",
    );
  });

  it("should handle complex search query with all parameters", () => {
    const url = constructUrl({
      baseUrl,
      params: new URLSearchParams({
        q: "search term",
        filter_by: "name:[John, Doe] && age:<20",
        sort_by: "age:desc,name:desc",
        page: "1",
        limit: "10",
        prefix: "true",
      }),
    });
    expect(url).toBe(
      "https://api.example.com/collections?q=search+term&filter_by=name%3A%5BJohn%2C+Doe%5D+%26%26+age%3A%3C20&sort_by=age%3Adesc%2Cname%3Adesc&page=1&limit=10&prefix=true",
    );
  });

  it("should handle baseUrl with trailing slash", () => {
    const url = constructUrl({
      baseUrl: "https://api.example.com/collections/",
      params: new URLSearchParams({
        q: "test",
      }),
    });
    expect(url).toBe("https://api.example.com/collections/?q=test");
  });

  it("should handle baseUrl with existing query parameters", () => {
    const url = constructUrl({
      baseUrl: "https://api.example.com/collections?version=1",
      params: new URLSearchParams({
        q: "test",
      }),
    });
    expect(url).toBe("https://api.example.com/collections?version=1?q=test");
  });

  it("should properly encode special characters in values", () => {
    const url = constructUrl({
      baseUrl,
      params: new URLSearchParams({
        q: "test & query + spaces",
        filter: 'category:"Books & Media"',
      }),
    });
    expect(url).toBe(
      "https://api.example.com/collections?q=test+%26+query+%2B+spaces&filter=category%3A%22Books+%26+Media%22",
    );
  });

  it("should handle all Typesense search parameters", () => {
    const url = constructUrl({
      baseUrl,
      params: new URLSearchParams({
        q: "search",
        query_by: "title,description",
        filter_by:
          "category:[Electronics, Phones] && price:>=100 && in_stock:true",
        sort_by: "popularity:desc,price:asc",
        facet_by: "category,brand",
        max_facet_values: "10",
        page: "1",
        per_page: "20",
        group_by: "brand",
        group_limit: "3",
        include_fields: "title,description,price",
        exclude_fields: "internal_id",
        highlight_fields: "title,description",
        highlight_full_fields: "title",
        prefix: "true",
        cache: "true",
      }),
    });

    const decodedUrl = decodeURIComponent(url);
    expect(decodedUrl).toBe(
      "https://api.example.com/collections?q=search&query_by=title,description&filter_by=category:[Electronics,+Phones]+&&+price:>=100+&&+in_stock:true&sort_by=popularity:desc,price:asc&facet_by=category,brand&max_facet_values=10&page=1&per_page=20&group_by=brand&group_limit=3&include_fields=title,description,price&exclude_fields=internal_id&highlight_fields=title,description&highlight_full_fields=title&prefix=true&cache=true",
    );
  });
});
