"use client";

import Navbar from "@/components/Navbar";
import { useCreateTournament } from "./hooks/useCreateTournament";
import { CreateHeader } from "./components/CreateHeader";
import { Step1Name } from "./components/Step1Name";
import { Step2Format } from "./components/Step2Format";
import { Step3Mode } from "./components/Step3Mode";
import { Step4Confirm } from "./components/Step4Confirm";

export default function CreateTournamentPage() {
    const {
        user,
        step,
        setStep,
        submitting,
        error,
        form,
        setForm,
        canNext1,
        handleSubmit
    } = useCreateTournament();

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0f1923] text-white">
            <Navbar />

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                <CreateHeader step={step} />

                {step === 1 && (
                    <Step1Name 
                        form={form} 
                        setForm={setForm} 
                        canNext={canNext1} 
                        onNext={() => setStep(2)} 
                    />
                )}

                {step === 2 && (
                    <Step2Format 
                        form={form} 
                        setForm={setForm} 
                        onPrev={() => setStep(1)} 
                        onNext={() => setStep(3)} 
                    />
                )}

                {step === 3 && (
                    <Step3Mode 
                        form={form} 
                        setForm={setForm} 
                        onPrev={() => setStep(2)} 
                        onNext={() => setStep(4)} 
                    />
                )}

                {step === 4 && (
                    <Step4Confirm 
                        form={form} 
                        onPrev={() => setStep(3)} 
                        onSubmit={handleSubmit} 
                        submitting={submitting} 
                        error={error} 
                    />
                )}
            </main>
        </div>
    );
}
