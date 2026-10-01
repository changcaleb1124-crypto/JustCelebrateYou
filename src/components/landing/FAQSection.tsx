'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
}

export default function FAQSection() {
    const faqs: FAQItem[] = [
        {
            question: 'Do contributors need an account or an app to send a video?',
            answer: 'No. Friends and family simply open your celebration link in any modern mobile or desktop browser. They can record directly with their camera or upload an existing video file without creating an account or downloading an app.'
        },
        {
            question: 'What video limits apply to messages?',
            answer: 'In-browser camera recordings can be up to 60 seconds per message. If someone prefers uploading a video from their phone or computer, files up to 50MB in MP4, WebM, or MOV formats are supported.'
        },
        {
            question: 'How does the recipient claim their celebration?',
            answer: 'From your celebration page, you can generate a gift invite link to send directly to the recipient. When they open the link, they can claim the celebration into their own account, saving it to their library.'
        },
        {
            question: 'Does the creator lose access once the recipient claims it?',
            answer: 'No. The celebration remains accessible in your dashboard under ‘Created by You’, while appearing in the recipient’s dashboard under ‘Saved for You’. Both of you can log in to revisit the messages.'
        },
        {
            question: 'Can the creator delete or manage messages?',
            answer: 'Yes. As the page creator, you have controls to remove individual video messages directly from the celebration page at any time.'
        }
    ];

    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="faq" className="landing-section" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
            <div className="landing-container">
                <div style={{ textAlign: 'center' }}>
                    <div className="section-badge">
                        <HelpCircle size={16} />
                        <span>Common Questions</span>
                    </div>
                    <h2 className="section-title">Frequently Asked Questions</h2>
                    <p className="section-subtitle">
                        Everything you need to know about creating, collecting, and saving celebrations.
                    </p>
                </div>

                <div className="faq-list">
                    {faqs.map((faq, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <div key={faq.question} className="faq-item">
                                <button
                                    type="button"
                                    className="faq-button"
                                    onClick={() => toggleFAQ(idx)}
                                    aria-expanded={isOpen}
                                >
                                    <span>{faq.question}</span>
                                    <ChevronDown 
                                        size={20} 
                                        style={{ 
                                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s ease',
                                            flexShrink: 0,
                                            color: '#888'
                                        }} 
                                    />
                                </button>
                                {isOpen && (
                                    <div className="faq-answer animate-fade-in">
                                        <p>{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
