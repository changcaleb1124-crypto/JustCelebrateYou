'use client';

export default function HowItWorks() {
    const steps = [
        {
            number: '1',
            title: 'Create',
            description: 'Set up a celebration for your loved one.'
        },
        {
            number: '2',
            title: 'Invite',
            description: 'Share a link with friends and family so they can record a video message.'
        },
        {
            number: '3',
            title: 'Celebrate',
            description: 'Give your recipient a collection of messages they can save and revisit.'
        }
    ];

    return (
        <section id="how-it-works" className="landing-section">
            <div className="landing-container">
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h2 
                        className="section-title"
                        style={{
                            fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)',
                            fontWeight: 700,
                            color: '#1F2937',
                            letterSpacing: '-0.02em',
                            margin: 0
                        }}
                    >
                        A meaningful gift in three simple steps
                    </h2>
                </div>

                <div className="steps-grid-3">
                    {steps.map((step) => (
                        <div key={step.number} className="step-card-simple">
                            <div className="step-badge-number">
                                {step.number}
                            </div>
                            <h3 className="step-card-title">
                                {step.title}
                            </h3>
                            <p className="step-card-description">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
