'use client';

import { Sparkles, PlusCircle, Users, HeartHandshake, BookmarkCheck } from 'lucide-react';

export default function HowItWorks() {
    const steps = [
        {
            number: '1',
            title: 'Create',
            icon: <PlusCircle size={20} />,
            description: 'Set up a celebration page with the recipient’s name and occasion in under a minute.'
        },
        {
            number: '2',
            title: 'Collect',
            icon: <Users size={20} />,
            description: 'Share your link. Friends and family record or upload short video messages in their browser.'
        },
        {
            number: '3',
            title: 'Celebrate',
            icon: <HeartHandshake size={20} />,
            description: 'Reveal the collection on their special day so they can watch all their messages gathered together.'
        },
        {
            number: '4',
            title: 'Save & Revisit',
            icon: <BookmarkCheck size={20} />,
            description: 'The recipient claims the celebration into their library, while you keep access in your dashboard.'
        }
    ];

    return (
        <section id="how-it-works" className="landing-section">
            <div className="landing-container">
                <div style={{ textAlign: 'center' }}>
                    <div className="section-badge">
                        <Sparkles size={15} />
                        <span>Simple 4-Step Journey</span>
                    </div>
                    <h2 className="section-title">How it works</h2>
                    <p className="section-subtitle">
                        From gathering the first message to the moment they save it, every step is straightforward.
                    </p>
                </div>

                <div className="steps-grid">
                    {steps.map((step) => (
                        <div key={step.number} className="step-card">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div className="step-number">{step.number}</div>
                                <div style={{ color: 'var(--accent-color)', opacity: 0.85 }}>{step.icon}</div>
                            </div>
                            <h3 className="step-title">{step.title}</h3>
                            <p className="step-desc">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
