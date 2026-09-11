import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("homepage", () => {
  it("renders hero, form, and permission notice", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /convert video to mp3/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analyze/i })).toBeInTheDocument();
    expect(screen.getAllByText(/only convert media you own/i).length).toBeGreaterThan(0);
  });

  it("exposes an accessible progress region", () => {
    render(<Home />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
