'use client';

import { 
    Cake, 
    Heart, 
    GraduationCap, 
    Award, 
    Flame, 
    PartyPopper, 
    Baby, 
    SunMedium 
} from 'lucide-react';

export default function OccasionsGrid() {
    const occasions = [
        {
            title: 'Milestone Birthdays',
            desc: 'Gather loved ones near and far to make their 18th, 30th, 50th, or 80th unforgettable.',
            icon: <Cake size={22} />,
            isMemorial: false,
        },
        {
            title: 'Weddings & Anniversaries',
            desc: 'Collect heartfelt toasts, well wishes, and marriage advice from family and friends.',
            icon: <Heart size={22} />,
            isMemorial: false,
        },
        {
            title: 'Graduations & New Chapters',
            desc: 'Celebrate degrees, trade milestones, or starting a new career with collective encouragement.',
            icon: <GraduationCap size={22} />,
            isMemorial: false,
        },
        {
            title: 'Appreciation & Gratitude',
            desc: 'Say thank you to extraordinary teachers, mentors, healthcare workers, and colleagues.',
            icon: <Award size={22} />,
            isMemorial: false,
        },
        {
            title: 'In Loving Memory',
            desc: 'Gather cherished memories and tributes to honor a loved one’s life and legacy together.',
            icon: <Flame size={22} />,
            isMemorial: true,
        },
        {
            title: 'Retirements & Farewells',
            desc: 'Honor decades of dedication, shared laughter, and meaningful teamwork as they embark on what’s next.',
            icon: <PartyPopper size={22} />,
            isMemorial: false,
        },
        {
            title: 'Baby Showers & New Parents',
            desc: 'Surround expecting parents with loving welcomes, funny parenting tips, and warm blessings.',
            icon: <Baby size={22} />,
            isMemorial: false,
        },
        {
            title: 'Encouragement & Recovery',
            desc: 'Send uplifting words, prayers, and positive spirits during recovery or difficult seasons.',
            icon: <SunMedium size={22} />,
            isMemorial: false,
        },
    ];

    return (
        <section id="occasions" className="landing-section">
            <div className="landing-container">
                <div style={{ textAlign: 'center' }}>
                    <div className="section-badge">
                        <span>Milestones & Moments</span>
                    </div>
                    <h2 className="section-title">Celebrations for every meaningful moment</h2>
                    <p className="section-subtitle">
                        From joyful celebrations to heartfelt memorials, gather the voices of the people who care.
                    </p>
                </div>

                <div className="occasions-grid">
                    {occasions.map((occasion) => (
                        <div 
                            key={occasion.title} 
                            className={`occasion-card ${occasion.isMemorial ? 'occasion-card-memorial' : ''}`}
                        >
                            <div className={`occasion-icon-wrap ${occasion.isMemorial ? 'occasion-icon-memorial' : ''}`}>
                                {occasion.icon}
                            </div>
                            <h3 className="occasion-title" style={occasion.isMemorial ? { color: '#334155' } : {}}>
                                {occasion.title}
                            </h3>
                            <p className="occasion-desc">{occasion.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
