import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** смена значений в массиве сбрасывает границу (например route key) */
  resetKeys?: unknown[];
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  override componentDidUpdate(prev: Props): void {
    if (this.state.error && prev.resetKeys !== this.props.resetKeys) {
      const changed =
        (prev.resetKeys?.length ?? 0) !== (this.props.resetKeys?.length ?? 0) ||
        (this.props.resetKeys ?? []).some((k, i) => k !== prev.resetKeys?.[i]);
      if (changed) this.setState({ error: null });
    }
  }

  private reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <h2 className="text-lg font-semibold">Что-то пошло не так</h2>
          <p className="max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
          <Button variant="outline" size="sm" onClick={this.reset}>
            Обновить
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
