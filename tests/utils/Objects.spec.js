import { isObject, deepCopyObj, objEquals, validateObjNestedFields } from 'utils/Objects';

describe('Object utils', () => {
    describe('deepCopyObj', () => {
        const objToCopy = {
            a: {
                b: 'B',
                c: 25,
                d: [ 1, 2, 3, 4 ]
            }
        };

        it('should deep copy an object, including arrays and objects', () => {
            const copiedObj = deepCopyObj(objToCopy);
            const expected = JSON.stringify(objToCopy);
            const received = JSON.stringify(copiedObj);

            expect(received).toEqual(expected);
        });

        it('should have new pointers for arrays in the copied object', () => {
            const copiedObj = deepCopyObj(objToCopy);

            copiedObj.a.d.push('newVal');

            expect(copiedObj.a.d.length).toEqual(objToCopy.a.d.length + 1);
        });
    });

    describe('validateObjNestedFields', () => {
        const objToValidate = {
            response: {
                data: {
                    someNestedData: 'myVal',
                    moreNesting: {
                        moreNestedData: 'anotherVal'
                    }
                }
            }
        };

        it('should check object validity by arguments of any length', () => {
            const received1 = validateObjNestedFields(objToValidate, 'response', 'data', 'someNestedData');
            const received2 = validateObjNestedFields(objToValidate, 'response', 'data', 'moreNesting');
            const received3 = validateObjNestedFields(objToValidate, 'response', 'data', 'moreNesting', 'moreNestedData');
            const received4 = validateObjNestedFields(objToValidate, 'response');
            const received5 = validateObjNestedFields(objToValidate);

            expect(received1).toBe(true);
            expect(received2).toBe(true);
            expect(received3).toBe(true);
            expect(received4).toBe(true);
            expect(received5).toBe(true);
        });

        it('should reject invalid objects', () => {
            const received1 = validateObjNestedFields(objToValidate, 'response-a', 'data', 'someNestedData');
            const received2 = validateObjNestedFields(objToValidate, 'response', 'data-a', 'someNestedData');
            const received3 = validateObjNestedFields(objToValidate, 'response', 'data', 'someNestedData-a');
            const received4 = validateObjNestedFields();
            const received5 = validateObjNestedFields(null);

            expect(received1).toBe(false);
            expect(received2).toBe(false);
            expect(received3).toBe(false);
            expect(received4).toBe(false);
            expect(received5).toBe(false);
        });

        it('should accept an array', () => {
            const received1 = validateObjNestedFields(objToValidate, ['response', 'data', 'someNestedData']);
            const received2 = validateObjNestedFields(objToValidate, ['response', 'data', 'moreNesting']);
            const received3 = validateObjNestedFields(objToValidate, ['response', 'data', 'moreNesting', 'moreNestedData']);
            const received4 = validateObjNestedFields(objToValidate, ['response']);
            const received5 = validateObjNestedFields(objToValidate);
            const receivedInvalid = validateObjNestedFields(objToValidate, 'response-a', 'data', 'someNestedData');

            expect(received1).toBe(true);
            expect(received2).toBe(true);
            expect(received3).toBe(true);
            expect(received4).toBe(true);
            expect(received5).toBe(true);
            expect(receivedInvalid).toBe(false);
        });
    });

    describe('objEquals', () => {
        const equal1Obj1 = {
            a: {
                b: 25
            }
        };
        const equal1Obj2 = {
            a: {
                b: '25'
            }
        };
        const equal2Obj1 = {
            a: {
                b: 'B',
                c: 25,
                d: [ 1, 2, 3, 4 ]
            }
        };
        const equal2Obj2 = {
            a: JSON.stringify({
                b: 'B',
                c: '25',
                d: [ 2, 1, 4, 3 ]
            })
        };
        const equal2Obj3 = {
            a: JSON.stringify({
                c: '25',
                d: [ 2, 1, 4, 3 ],
                b: 'B'
            })
        };
        const equal3Obj1 = {
            a: {
                b: 'B',
                c: '25',
                d: {
                    e: [ 2, 1, 4, 3 ]
                }
            }
        };
        const equal3Obj2 = {
            a: JSON.stringify({
                c: '25',
                d: JSON.stringify(JSON.stringify({
                    e: [ 2, 1, 4, 3 ]
                })),
                b: 'B'
            })
        };

        it('should consider two objects that differ in ways other than types to not be equal', () => {
            expect(objEquals(equal1Obj1, equal2Obj1)).toBe(false);
        });

        it('should optionally consider two objects equal only if values have the same types', () => {
            expect(objEquals(equal1Obj1, equal1Obj2, false)).toBe(false);
            expect(objEquals(equal2Obj1, equal2Obj2, false)).toBe(false);
        });

        it('should optionally consider two objects equal even if values do not have the same types', () => {
            expect(objEquals(equal1Obj1, equal1Obj2)).toBe(true);
            expect(objEquals(equal2Obj1, equal2Obj2)).toBe(true);
        });

        it('should optionally consider two objects equal regardless of order of key-val declarations', () => {
            expect(objEquals(equal2Obj1, equal2Obj2)).toBe(true);
            expect(objEquals(equal2Obj2, equal2Obj3)).toBe(true);
            expect(objEquals(equal2Obj1, equal2Obj3)).toBe(true);
        });

        it('should optionally consider two objects equal regardless of levels of JSON.stringify calls', () => {
            expect(objEquals(equal3Obj1, equal3Obj2)).toBe(true);
        });
    });

    describe('isObject', () => {
        it('should return false for all non-object-like variables', () => {
            const nonObjectVariables = [
                'hello',
                5,
                true,
                undefined,
                Symbol()
            ];

            nonObjectVariables.forEach(type => {
                expect(isObject(type)).toBe(false);
            });
        });

        it('should process object-like variables according to the respective option boolean', () => {
            class ArrayMimic {
                length = 0;
            }

            const likeObjects = [
                {
                    variable: null,
                    field: 'includeNull'
                },
                {
                    variable: [],
                    field: 'includeArraysAndMimics'
                },
                {
                    variable: new ArrayMimic(),
                    field: 'includeArraysAndMimics'
                },
                {
                    variable: () => {},
                    field: 'includeFunctions'
                }
            ];
            const includeValues = [ true, false ];

            likeObjects.forEach(sample => {
                includeValues.forEach(expected => {
                    const { variable, field } = sample;
                    const received = isObject(variable, {
                        [field]: expected
                    });

                    expect(received).toBe(expected);
                });
            });
        });

        it('should process different types of real objects according to the respective options', () => {
            class SampleCustomClass {
                a = 'A';
                b = 'B';
                func() {
                    return this.a;
                }
            }

            const objectTypes = [
                {
                    variable: {},
                    isObjectLiteral: true,
                    resultIfFieldIsFalse: {
                        includeNativeClasses: true,
                        includeCustomClasses: true
                    }
                },
                {
                    variable: new SampleCustomClass(),
                    isObjectLiteral: false,
                    resultIfFieldIsFalse: {
                        includeNativeClasses: true,
                        includeCustomClasses: false
                    }
                },
                {
                    variable: new Date(),
                    isObjectLiteral: false,
                    resultIfFieldIsFalse: {
                        includeNativeClasses: false,
                        includeCustomClasses: true
                    }
                },
            ];

            objectTypes.forEach(objectType => {
                const { variable, isObjectLiteral, resultIfFieldIsFalse } = objectType;

                expect(isObject(variable)).toBe(true);
                expect(isObject(variable, {
                    includeNativeClasses: false,
                    includeCustomClasses: false
                })).toBe(isObjectLiteral);
                expect(isObject(variable, {
                    includeNativeClasses: false,
                    includeCustomClasses: true
                })).toBe(resultIfFieldIsFalse.includeNativeClasses);
                expect(isObject(variable, {
                    includeNativeClasses: true,
                    includeCustomClasses: false
                })).toBe(resultIfFieldIsFalse.includeCustomClasses);
            });
        });
    });
});
