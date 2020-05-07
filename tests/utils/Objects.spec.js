import { isObject, deepCopyObj, diffObjects, objEquals, validateObjNestedFields } from 'utils/Objects';

describe('Object utils', () => {
    class SampleCustomClass {
        a = 'A';
        b = 'B';
        func() {
            return this.a;
        }
    }

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

    describe('diffObjects', () => {
        it('should find modified fields of any type in nested objects', () => {
            const a = {
                a: {
                    b: {
                        c: false,
                        d: {
                            e: null
                        },
                        f: {
                            g: {}
                        }
                    },
                    c: [
                        {
                            a: () => {}
                        },
                        {
                            a: () => {'a';}
                        }
                    ]
                },
                arr: [ 'a', 'b' ]
            };

            const b = {
                a: {
                    b: {
                        c: true,
                        d: {
                            e: undefined
                        },
                        f: {
                            g: {}
                        }
                    },
                    c: [
                        {
                            a: () => {}
                        },
                        {
                            a: () => {'b';}
                        }
                    ]
                },
                arr: [ 'a', 'b', 'c' ]
            };

            const delta = diffObjects(a, b);

            expect(delta.size).toBe(4);
            expect(delta).toContain('a.b.c');
            expect(delta).toContain('a.b.d.e');
            expect(delta).toContain('a.c[1].a');
            expect(delta).toContain('arr[2]');
        });

        it('should find elements that differ in nested arrays', () => {
            const a = {
                a: [
                    [ 0, 1 ]
                ]
            };
            const b = {
                a: [
                    [ 0, 2 ]
                ]
            };

            const delta = diffObjects(a, b);

            expect(delta.size).toBe(1);
            expect(delta).toContain('a[0][1]');
        });

        it('should optionally exclude array index values', () => {
            const a = {
                a: [
                    [ 0, 1 ]
                ],
                b: [ 'a', 'b' ],
                c: [
                    { x: 3, y: 4 }
                ],
                d: [ 0, 1 ]
            };
            const b = {
                a: [
                    [ 0, 2 ]
                ],
                b: [ 'a', 'b', 'c' ],
                c: [
                    { x: 3, y: 5, z: 6 }
                ],
                d: [ 0, 1 ]
            };

            const delta = diffObjects(a, b, false);

            expect(delta.size).toBe(4);
            expect(delta).toContain('a');
            expect(delta).toContain('b');
            expect(delta).toContain('c.y');
            expect(delta).toContain('c.z');
        });

        it('should work for classes', () => {
            const a = new SampleCustomClass();
            const b = new SampleCustomClass();
            const fieldToModify = 'a';

            const deltaSame = diffObjects(a, b);
            expect(deltaSame.size).toBe(0);

            b.c = 7;
            const deltaDiffNewField = diffObjects(a, b);
            expect(deltaDiffNewField.size).toBe(1);
            expect(deltaDiffNewField).toContain('c');

            a[fieldToModify] = 7;
            const deltaDiffModifiedField = diffObjects(a, b);
            expect(deltaDiffModifiedField.size).toBe(2);
            expect(deltaDiffModifiedField).toContain(fieldToModify);
            expect(deltaDiffModifiedField).toContain('c');
        });

        it('should work for variables that are not "real" objects', () => {
            const nonObjectTypes = [
                [ 'a', 'b' ],
                [ 1, 2 ],
                [ null, undefined ],
                [ () => {}, () => {'a'} ]
            ];

            const testDiffForNonObjects = (a, b) => {
                const deltaString = diffObjects(a, b);
                expect(deltaString.size).toBe(1);
                expect(deltaString).toContain('.');
            };

            nonObjectTypes.forEach(([ arg1, arg2 ]) => {
                testDiffForNonObjects(arg1, arg2);
                expect(diffObjects(arg1, arg1).size).toBe(0);
                expect(diffObjects(arg2, arg2).size).toBe(0);
            });
        });

        it('should diff arrays with and without optional boolean index value inclusion', () => {
            const a = [
                [ 'a', 'b', 'c' ],
                [ 'd', 'e', 'f' ],
                [ {}, {}, {} ],
                {
                    g: 'G'
                }
            ];
            const b = [
                [ 'a', 'W', 'X' ],
                [ 'd', 'Y', 'Z' ],
                [ {}, {}, {} ],
                {
                    g: 'G'
                }
            ];

            const deltaWithIndexVals = diffObjects(a, b);
            const deltaWithoutIndexVals = diffObjects(a, b, false);

            expect(deltaWithIndexVals.size).toBe(4);
            expect(deltaWithIndexVals).toContain('[0][1]');
            expect(deltaWithIndexVals).toContain('[0][2]');
            expect(deltaWithIndexVals).toContain('[1][1]');
            expect(deltaWithIndexVals).toContain('[1][2]');

            expect(deltaWithoutIndexVals.size).toBe(2);
            expect(deltaWithoutIndexVals).toContain('[0]');
            expect(deltaWithoutIndexVals).toContain('[1]');
        });
    });

    describe('objEquals', () => {
        const notEqual1Obj1 = {
            a: {
                b: 25
            }
        };
        const notEqual1Obj2 = {
            a: {
                b: '25'
            }
        };
        const notEqual2Obj1 = {
            a: {
                b: 'B',
                c: 25,
                d: [ 1, 2, 3, 4 ]
            }
        };
        const notEqual2Obj2 = {
            a: {
                b: 'B',
                c: 25,
                d: [ 2, 1, 4, 3 ]
            }
        };
        const equalObj1 = {
            a: {
                b: 'B',
                c: 25,
                d: [ 2, 1, 4, 3 ]
            }
        };
        const equalObj2 = {
            a: {
                c: 25,
                d: [ 2, 1, 4, 3 ],
                b: 'B'
            }
        };

        it('should consider two objects equal only if values have the same types', () => {
            expect(objEquals(notEqual1Obj1, equalObj1)).toBe(false);
            expect(objEquals(notEqual1Obj1, notEqual1Obj2)).toBe(false);
        });

        it('should take array order into account', () => {
            expect(objEquals(notEqual2Obj1, notEqual2Obj2)).toBe(false);
        });

        it('should consider two objects equal regardless of order of key-val declarations', () => {
            expect(objEquals(equalObj1, equalObj2)).toBe(true);
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
            const likeObjects = [
                {
                    variable: null,
                    field: 'includeNull'
                },
                {
                    variable: [],
                    field: 'includeArrays'
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

        it('should process classes vs object literals according to the respective options', () => {
            const classTypes = [
                new SampleCustomClass(), // custom class
                new Date(), // native class
                new String() // primitive wrapper
            ];

            expect(isObject({})).toBe(true);
            expect(isObject({}, { includeClasses: false })).toBe(true);

            classTypes.forEach(classType => {
                expect(isObject(classType)).toBe(true);
                expect(isObject(classType, { includeClasses: false })).toBe(false);
                expect(isObject(classType, { includeClasses: true })).toBe(true);
            });
        });
    });
});
