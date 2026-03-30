import { useState } from "react";

const data = [
 
  {
    q: "Is there a roadmap?",
    a: "No fixed roadmap. Bad Frogs is about art first anything else comes naturally, if at all.",
  },
  {
    q: "Why Bad Frogs?",
    a: "Because each frog has its own attitude, expression, and raw street style vibe.",
  },
  {
    q: "What makes each frog unique?",
    a: "Different colors, moods, and details every piece has its own personality.",
  },
  {
    q: "Who is behind Bad Frogs?",
    a: "An independent creator exploring a raw, spray-inspired style. :)",
  },
  {
    q: "Why should I mint?",
    a: "Only if you genuinely like the art and want to own a piece of it.",
  },
];

function About() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-4xl text-center mb-10 font-bold">
        BAD FROGS
      </h1>

      <div className="space-y-4">
        {data.map((item, index) => (
          <div
            key={index}
            className="border-b border-gray-800 pb-4 cursor-pointer"
            onClick={() => toggle(index)}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {item.q}
              </h2>

              <span className="text-gray-500">
                {openIndex === index ? "−" : "+"}
              </span>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                openIndex === index
                  ? "max-h-40 mt-2"
                  : "max-h-0"
              }`}
            >
              <p className="text-gray-400">{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default About;