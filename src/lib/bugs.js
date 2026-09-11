// The 5 bugs seeded into target-app (see self-healing-pipeline's bug-seed/* branches
// and RUNBOOK.md section 5). Each entry lists the HTTP requests needed to trigger it,
// in order - some bugs need a product seeded first before the order that trips them.
export const BUGS = [
  {
    id: "bug1",
    branch: "bug-seed/d16-bug1-npe-sku-normalize",
    title: "Bug 1 — NullPointerException normalizing a null SKU",
    description:
      "A null SKU blows up before the product lookup even runs, while normalizing it per order item.",
    requests: [
      {
        label: "Trigger",
        method: "POST",
        path: "/api/orders",
        body: {
          customerName: "Alice",
          items: [{ sku: null, quantity: 1 }],
        },
      },
    ],
  },
  {
    id: "bug2",
    branch: "bug-seed/d16-bug2-oob-last-item-log",
    title: "Bug 2 — IndexOutOfBoundsException logging the last item",
    description:
      "Any successful order trips this — the bad log line runs right before the order is returned. Needs WIDGET-1 seeded first.",
    requests: [
      {
        label: "Seed product",
        method: "POST",
        path: "/api/products",
        body: { sku: "WIDGET-1", name: "Widget", unitPrice: 9.99, stockQuantity: 100 },
      },
      {
        label: "Trigger",
        method: "POST",
        path: "/api/orders",
        body: {
          customerName: "Bob",
          items: [{ sku: "WIDGET-1", quantity: 1 }],
        },
      },
    ],
  },
  {
    id: "bug3",
    branch: "bug-seed/d16-bug3-aioob-sku-parse",
    title: "Bug 3 — ArrayIndexOutOfBounds / NumberFormatException parsing a SKU",
    description:
      "Creating a product whose SKU has no numeric part after a dash blows up the category-code parser.",
    requests: [
      {
        label: "Trigger",
        method: "POST",
        path: "/api/products",
        body: { sku: "NODASH", name: "Bad SKU", unitPrice: 1.0, stockQuantity: 10 },
      },
    ],
  },
  {
    id: "bug4",
    branch: "bug-seed/d16-bug4-arith-avg-price",
    title: "Bug 4 — ArithmeticException computing the average unit price",
    description:
      "Ordering a quantity of 0 divides by zero while logging the average unit price. Needs WIDGET-1 seeded first.",
    requests: [
      {
        label: "Seed product",
        method: "POST",
        path: "/api/products",
        body: { sku: "WIDGET-1", name: "Widget", unitPrice: 9.99, stockQuantity: 100 },
      },
      {
        label: "Trigger",
        method: "POST",
        path: "/api/orders",
        body: {
          customerName: "Carol",
          items: [{ sku: "WIDGET-1", quantity: 0 }],
        },
      },
    ],
  },
  {
    id: "bug5",
    branch: "bug-seed/d16-bug5-npe-greeting",
    title: "Bug 5 — NullPointerException building a personalized greeting",
    description: "A null customer name blows up while building the order's greeting message.",
    requests: [
      {
        label: "Trigger",
        method: "POST",
        path: "/api/orders",
        body: { customerName: null, items: [] },
      },
    ],
  },
];

export function toCurl(baseUrl, req) {
  const body = JSON.stringify(req.body);
  const escaped = body.replace(/'/g, "'\\''");
  return `curl -X ${req.method} ${baseUrl.replace(/\/$/, "")}${req.path} -H "Content-Type: application/json" -d '${escaped}'`;
}
