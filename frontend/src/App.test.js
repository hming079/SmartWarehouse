import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders devices dashboard", () => {
  render(<App />);
  const headingElement = screen.getByText(/air conditioner/i);
  expect(headingElement).toBeInTheDocument();
});
