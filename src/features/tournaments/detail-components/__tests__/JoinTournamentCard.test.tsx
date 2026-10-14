import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import JoinTournamentCard from "../JoinTournamentCard";

describe("JoinTournamentCard", () => {
    it("joins on click", () => {
        const onJoin = vi.fn();
        render(<JoinTournamentCard isOngoing={false} playerCount={8} joining={false} onJoin={onJoin} />);
        expect(screen.getByText("ลงชื่อร่วมแข่งกับอีก 8 คน")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: /เข้าร่วมการแข่งขัน/ }));
        expect(onJoin).toHaveBeenCalledTimes(1);
    });

    it("tells late joiners they can still join an ongoing tournament", () => {
        render(<JoinTournamentCard isOngoing playerCount={8} joining={false} onJoin={() => {}} />);
        expect(screen.getByText(/กำลังแข่งอยู่ ยังเข้าร่วมได้/)).toBeTruthy();
    });

    it("disables the button while joining", () => {
        render(<JoinTournamentCard isOngoing={false} playerCount={0} joining onJoin={() => {}} />);
        expect((screen.getByRole("button", { name: /เข้าร่วมการแข่งขัน/ }) as HTMLButtonElement).disabled).toBe(true);
    });
});
