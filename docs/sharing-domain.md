# Sharing domain

## Purpose

Sharing records how a posted expense or income is allocated between the owner and
other people. It is separate from the ledger movement that starts the workflow
and from the expected or posted movements created when a participant is settled.

## Ubiquitous language

### MovementShare

`MovementShare` belongs to exactly one posted `EXPENSE` or `INCOME` movement. It
stores the movement type, total and currency, the owner's allocation, and the
participants included in the sharing decision.

The owner is represented explicitly by `ownerAllocation`; the system does not
use a magic person identifier such as `you`.

### Participant and identity

A participant has a stable `SharingPersonId`, an amount that may be zero, and a
settlement status. A new person is referenced by `displayName` when created; an
existing person is referenced by `personId`. Exactly one of those references is
present in a command. The display name is presentation data after creation.

Renaming a person keeps the same `SharingPersonId`, so historical shares and
groups display the current name.

### Allocation

`ShareAllocationMode` determines how amounts are calculated:

- `EQUAL`: divide the total equally across the owner and participants.
- `PARTS`: divide the total according to positive integer parts.
- `AMOUNTS`: accept explicit amounts.

The owner absorbs the rounding cent in `EQUAL` and `PARTS` allocations. The
owner amount plus all participant amounts must equal the movement total at the
currency precision.

### Settlement

`ShareSettlementStatus` describes whether money is expected to move between the
owner and a participant:

- `NOT_REQUIRED`: no reimbursement or payout is required.
- `PENDING`: an expected opposite movement exists and has not been settled.
- `SETTLED`: the expected movement is resolved by a linked posted movement.

For an expense, `PENDING` means `Pending reimbursement` and `SETTLED` means
`Reimbursed`. For an income, the labels are `Pending payout` and `Paid out`.
`NOT_REQUIRED` is `No reimbursement` for an expense and `No payout required` for
an income.

A pending expense creates an expected income; a pending income creates an
expected expense. A settled participant stores the account, date and linked
posted movement used to settle it. A posted movement may settle at most one
participant and may not be the source movement.

### Invitations and groups

An invited participant is still registered even when their amount is zero. Zero
amounts are not removed before persistence and always have `NOT_REQUIRED`.

Groups are suggestions derived from sharing history. They are not a persistent
`Group` entity. A group is identified by the deterministic ordered set of
participant IDs, excludes the owner, and never copies amounts, parts or
settlement states when reused.

## Invariants

- A share belongs to an `EXPENSE` or `INCOME`; transfers cannot be shared.
- Participant amounts are greater than or equal to zero.
- A zero-amount participant has `NOT_REQUIRED`.
- `PENDING` has an expected movement reference.
- `SETTLED` has a linked posted settlement movement.
- Participants are unique and none is the owner.
- The owner allocation and participant allocations sum exactly to the movement
  total at the currency precision.
- Settlement currency, amount and type match the participant and source movement.
- A person command contains exactly one of `personId` and `displayName`.
- Renaming rejects blank names and collisions with another active person.
- Recurring templates may store only `PENDING` or `NOT_REQUIRED`; `SETTLED` is
  occurrence-specific.

## Given–When–Then examples

### Pending expense

**Given** a posted EUR 60 expense shared as EUR 40 owned and EUR 20 owed by a
participant

**When** the share is applied with `PENDING`

**Then** an expected EUR 20 income is created and the participant is labelled
`Pending reimbursement`.

### Reimbursed expense

**Given** a pending expense participant with an expected income

**When** a matching posted income is linked as its settlement

**Then** the expected movement is resolved, the account and date are stored, and
the participant is labelled `Reimbursed`.

### Pending income payout

**Given** a posted EUR 120 income shared as EUR 60 owned and EUR 60 belonging to
a participant

**When** the share is applied with `PENDING`

**Then** an expected EUR 60 expense is created and the participant is labelled
`Pending payout`.

### Completed income payout

**Given** the pending payout above

**When** the owner posts and links the EUR 60 opposite expense

**Then** the expected movement is resolved and the participant is labelled
`Paid out`.

### Zero-amount invite

**Given** a person is added as an invited participant with amount EUR 0

**When** the share is saved

**Then** the participant remains in the share with `NOT_REQUIRED`.

### Reusing a historical group

**Given** history contains the same ordered participant ID set multiple times

**When** group suggestions are queried

**Then** one suggestion is returned with merged usage count, latest date and a
deterministic key, without copying financial allocations or settlements.

### Renaming a person

**Given** a person ID appears in historical shares

**When** the active person is renamed to a unique non-blank name

**Then** the ID is unchanged and historical movements and suggestions show the
new name.

### Rounding

**Given** a EUR 10.00 movement shared equally by three people including the owner

**When** amounts are calculated at two decimals

**Then** the owner absorbs the rounding cent and all allocations sum to exactly
EUR 10.00.

### Recurring share

**Given** a recurring movement with a sharing template

**When** an occurrence is confirmed before materialization

**Then** people, amounts and pending/not-required states may be confirmed or
changed for that occurrence, while a settled state is not stored as the
recurring rule.
