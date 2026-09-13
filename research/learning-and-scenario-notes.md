# Learning and scenario notes for CORE

## Implemented campaign evidence — 12 September 2026

Chapters 2–6 now implement the following bounded interpretations. The older
scenario sketches below remain design history; their illustrative durations are
not the current campaign parameters.

| Mechanism | Verified primary sources | Implementation boundary |
| --- | --- | --- |
| Separate grid and equipment bottlenecks | [IEA energy security](https://www.iea.org/reports/energy-and-ai/ai-and-energy-security), [IEA electricity supply](https://www.iea.org/reports/energy-and-ai/energy-supply-for-ai) (2025) | Parallel milestone dates; fictional trade change affects new hardware, not the operating rack. |
| Whole-facility design and cooling tradeoffs | [DOE design guide](https://www.energy.gov/cmei/femp/articles/best-practices-guide-energy-efficient-data-center-design) (2024), [DOE cooling-water guidance](https://www.energy.gov/cmei/femp/cooling-water-efficiency-opportunities-federal-data-centers) | Preselected hybrid equipment permits dry operation with higher modeled electrical demand; water and service remain separate outcomes. |
| Commissioning and exercised recovery | [DOE commissioning](https://www.energy.gov/cmei/femp/commissioning-federal-buildings), [NIST SP 800-84](https://csrc.nist.gov/pubs/sp/800/84/final) (2006) | Explicit test after installation or recovery; one scripted exercise is not professional certification. |
| Shared-route vulnerability and continuity priorities | [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) (2010), [ITU cable resilience](https://www.itu.int/digital-resilience/submarine-cables/) | Two carrier contracts can share a corridor. Physical alternatives require preparation and testing. |
| Repair coordination and access constraints | [ITU cable-resilience report announcement](https://www.itu.int/en/mediacentre/Pages/PR-2026-07-10-Submarine-cable-resilience-report.aspx) (10 July 2026), [NIST contingency planning](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) | Cable cause remains unknown. Temporary critical transit is separate from repairing the original route. |

Battery power/energy, water limits, supply prices and event durations are explicit
authored assumptions. The heat chapter accounts for three two-hour exercises;
its title does not imply a full-week energy simulation. The what-if planner is a
conditional calculation with user-selected assumptions, without event probabilities.

Reviewed 12 September 2026. These are design recommendations for a teaching game. Fictional events and numerical game rules below are **invented design parameters**, not forecasts, regional measurements or current legal requirements. Sources support the underlying mechanisms.

## Correct the lessons embedded in the rules

The current model has useful transparent arithmetic, but several rules teach the wrong causal relationship. Make the corrected relationship visible through an action and consequence before introducing terminology.

| Current behavior, verified in `src/strategy/model.ts` | Recommended correction and learner task |
| --- | --- |
| `build()` immediately adds usable capacity. | Track planned → ordered → delivered → installed → tested → operational. First mission: commission one hall and discover an incorrectly configured cooling control before admitting customers. |
| A supply shock immediately reduces all existing compute. | Delay affected orders and replacements; running equipment remains available unless a modeled failure, support dependency or explicit restriction affects it. Let the player compare delivery dates and compatibility. |
| Batteries add power throughout an entire quarter. | Separate output limit in MW, stored energy in MWh and charge state. Have the player bridge a short interruption, then confront depletion. |
| An energy-contract upgrade restores physical grid capacity. | Separate price exposure from deliverability. A contract can change cost or rights; the modeled network and generation must supply the electricity. |
| Power and water mostly follow installed asset counts; PUE is a snapshot ratio. | Relate operation to workload, idle draw, cooling conditions and time. Display energy consumed over the same interval and boundary for PUE. |
| Emergency payments restore fixed capacity regardless of available resources. | Require a compatible spare, working alternate route, available rental capacity or an established agreement. Money buys a feasible response, not immunity. |

Commissioning is verification, documentation and operator preparation, not merely waiting for a progress bar. DOE describes design review, functional testing and training; its distributed-energy guidance distinguishes construction from acceptance testing. **Game interpretation:** make players test failure response and correct a problem before opening, without representing this exercise as professional certification. [DOE commissioning](https://www.energy.gov/cmei/femp/commissioning-federal-buildings), [DOE acceptance testing](https://www.energy.gov/cmei/femp/federal-energy-management-programs-distributed-energy-catalog-services).

Teach units through one readable example: **10 MW used continuously for 2 hours consumes 20 MWh**. The numbers are fictional; the dimensional relationship is real. An idealized 20 MWh battery supplying 10 MW lasts two hours before reserve and losses. It cannot sustain a month-long resource dispute. The billing screen should distinguish capacity, energy and tariff assumptions. [DOE glossary](https://www.energy.gov/cmei/fuels/full-text-glossary), [DOE electricity primer](https://www.energy.gov/sites/prod/files/2015/12/f28/united-states-electricity-industry-primer.pdf).

Introduce cooling as moving heat through a chain: chip → air or coolant → heat rejection → environment. Liquid cooling inside a rack does not, by itself, identify the site's water consumption. Show total water alongside energy, service delivered and local allocation. PUE compares facility energy with IT energy; WUE relates site water use to IT energy. Neither alone establishes a good environmental outcome. Water recovery can add energy and maintenance requirements; tradeoffs depend on design and conditions. [DOE cooling-water guide](https://www.energy.gov/cmei/femp/cooling-water-efficiency-opportunities-federal-data-centers), [DOE design guide](https://www.energy.gov/cmei/femp/articles/best-practices-guide-energy-efficient-data-center-design).

## Three fictional scenario arcs

### 1. The hall that cannot open

**Setup:** The player promises a second hall before a university research deadline. A fictional exporting jurisdiction introduces approval requirements affecting the selected hardware; a delayed transformer shipment independently threatens energization. IEA documents strained chip, transformer and other electricity-equipment supply chains, and the different pace of data-center and energy-infrastructure development. The invented policy is not a statement about today's export law. [IEA 2026 assessment](https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary), [IEA energy-security analysis](https://www.iea.org/reports/energy-and-ai/ai-and-energy-security).

**Causal chain:** Concentrated order book → shipment uncertainty → missed installation/testing window → delayed new service revenue. Existing commissioned equipment keeps working. A different brand may still share the affected factory, approval regime or component.

**Decisions:** Reschedule flexible research work; qualify an actually compatible alternative; lease already operational capacity subject to transfer limits; or preserve cash and negotiate a later service start. An alternate purchase has its own installation and testing time.

**Prototype parameters:** A four-week hardware delay and six-week transformer delay are invented. Present ranges until confirmed. The guide asks: “Which missing dependency prevents opening?” The debrief compares deadline performance, idle capital and options preserved—not just hardware purchased.

### 2. Two carriers, one corridor

**Setup:** An offshore cable incident interrupts both contracted carriers because they share a landing corridor. Diplomatic friction then delays repair access. The cause of damage remains unknown. ITU identifies accidental activity and natural hazards as major vulnerabilities, while its 2026 recommendations emphasize coordinated repair, permitting and geographic diversity. [ITU backgrounder](https://www.itu.int/en/mediacentre/backgrounders/Pages/submarine-cable-resilience.aspx), [ITU Porto outcomes](https://www.itu.int/digital-resilience/submarine-cables/events/about-porto-summit/).

**Causal chain:** Shared physical dependency → correlated link failure → congestion on remaining routes → service-specific degradation → uncertain repair duration. Local processing can continue while services needing remote data are constrained.

**Decisions:** Activate a tested independent route if it exists; reserve scarce alternate transit; prioritize critical transactions; defer bulk replication; communicate a recovery estimate with uncertainty. Buying a third carrier using the same landing does not solve the failure.

**Prototype parameters:** Seven days of degraded connectivity and an alternate route carrying 40% of contracted throughput are fictional. The mentor reveals the route map before asking for a response. Debrief explains why tested physical independence outperformed nominal bandwidth.

### 3. The heatwave and the interrupted agreement

**Setup:** A fictional cross-border electricity dispute reduces imports during a heatwave. The municipal utility also reduces the site's water allocation. These are separate constraints: a cheaper electricity contract cannot restore a severed supply path, and additional electrical capacity cannot create cooling water.

**Causal chain:** Less deliverable electricity plus higher cooling demand → reduced operating headroom; reduced water availability constrains water-dependent heat rejection. Choices made during design determine which responses are now feasible. IEA separates electricity physically supplied from operators' contractual sourcing; DOE emphasizes that cooling performance depends on system configuration and operating conditions. [IEA electricity-supply analysis](https://www.iea.org/reports/energy-and-ai/energy-supply-for-ai), [DOE design guidance](https://www.energy.gov/cmei/femp/articles/best-practices-guide-energy-efficient-data-center-design).

**Decisions:** Move deferrable work within its deadline; protect critical services; use preinstalled thermal/storage flexibility; activate a suitable alternative heat-rejection mode; or accept a controlled service reduction. A major cooling retrofit cannot materialize during the emergency.

**Prototype parameters:** A ten-day event, 25% import shortfall and 30% site-water reduction are invented. The mentor asks which workload can wait and what cannot. Debrief reports service, water, energy and cost separately.

## Make counterfactuals fair and learning inspectable

Preserve the current seed-based reproducibility, but store a complete exogenous event timeline. Branches must start from the same checkpoint, information, prices and background conditions. Player-caused effects may differ; explain the dependency. Do not reroll an easier crisis for the preferred strategy or reveal future facts only to one branch.

Compare the same time horizon and service commitments; include up-front investments, operating costs, unfinished construction, recovery time and unmet demand. Show forecasts as forecasts and realized outcomes afterward. One successful run does not prove a strategy universally superior.

Use short mentor interventions at a decision, after a consequence and during a replay. Let players predict an outcome, explain the bottleneck, then change one decision. NIST contingency guidance supports identifying priorities, developing recovery strategies and testing plans; its exercise guidance supports evaluating readiness and correcting weaknesses. The proposed branching comparison is a game-design application of those principles, not a NIST-prescribed method. [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final), [NIST SP 800-84](https://www.nist.gov/publications/guide-test-training-and-exercise-programs-it-plans-and-capabilities).
